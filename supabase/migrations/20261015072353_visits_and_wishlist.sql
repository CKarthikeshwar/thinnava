-- M4: my visits, private companion names, wishlist. Spec §6, §8, §9, §20–§22.
-- Tags (§7) extend save_visit / can_see_visit in M7; friend & internet entries join home_feed in M5.

create type public.rating as enum ('good', 'okayish', 'bad');

create table public.visits (
  id               uuid primary key,                -- client-generated (offline-safe, §17)
  author           uuid not null references public.profiles on delete cascade,
  place_id         text not null references public.places,
  visited_on       date not null,
  rating           public.rating not null,
  loved            text[] not null default '{}',
  disliked         text[] not null default '{}',
  price_per_person int check (price_per_person between 1 and 50000),
  notes            text check (char_length(notes) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index visits_author_created on public.visits (author, created_at desc);
create index visits_place on public.visits (place_id);
create trigger visits_touch before update on public.visits for each row execute function public.touch_updated_at();

create table public.visit_audience (
  visit_id uuid references public.visits on delete cascade,
  list_id  uuid references public.audience_lists on delete cascade,
  primary key (visit_id, list_id)
);

create table public.companion_names (
  id    uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles on delete cascade,
  name  text not null check (char_length(name) between 1 and 40)
);
create unique index companion_names_unique on public.companion_names (owner, lower(name));

create table public.visit_companion_names (
  visit_id          uuid references public.visits on delete cascade,
  companion_name_id uuid references public.companion_names on delete cascade,
  primary key (visit_id, companion_name_id)
);

create table public.wishlist_items (
  owner      uuid references public.profiles on delete cascade,
  place_id   text references public.places,
  created_at timestamptz not null default now(),
  primary key (owner, place_id)
);

-- Visibility helpers (spec §21.1) -------------------------------------------------------
create or replace function public.in_audience(p_owner uuid, p_viewer uuid, p_lists uuid[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from audience_lists l
    where l.id = any (p_lists) and l.owner = p_owner
      and (l.kind = 'all'
           or (l.kind = 'custom' and exists (select 1 from list_members m where m.list_id = l.id and m.member_id = p_viewer)))
  );
$$;

create or replace function public.can_see_visit(p_visit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from visits v
    where v.id = p_visit
      and (v.author = auth.uid()
           or (public.is_connected(auth.uid(), v.author)
               and public.in_audience(v.author, auth.uid(), array(select list_id from visit_audience where visit_id = v.id))))
  );
$$;

create or replace function public.can_see_wishlist(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
      or (public.is_connected(auth.uid(), p_owner)
          and public.in_audience(p_owner, auth.uid(), array(select list_id from wishlist_audience where owner = p_owner)));
$$;

-- RLS (spec §21.2): reads through these policies; all writes go through RPCs ----------------
alter table public.visits                enable row level security;
alter table public.visit_audience        enable row level security;
alter table public.companion_names       enable row level security;
alter table public.visit_companion_names enable row level security;
alter table public.wishlist_items        enable row level security;

create policy visits_select on public.visits for select to authenticated using (public.can_see_visit(id));
create policy visit_audience_select on public.visit_audience for select to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.author = auth.uid()));
create policy companion_names_select on public.companion_names for select to authenticated using (owner = auth.uid());
create policy visit_companions_select on public.visit_companion_names for select to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.author = auth.uid()));
create policy wishlist_select on public.wishlist_items for select to authenticated using (public.can_see_wishlist(owner));

-- Validation helpers -----------------------------------------------------------------------
create or replace function public.clean_dishes(p jsonb) returns text[]
language plpgsql immutable as $$
declare res text[] := '{}'; d text; seen text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'array' then return res; end if;
  for d in select regexp_replace(trim(x), '\s+', ' ', 'g') from jsonb_array_elements_text(p) x loop
    if d = '' then continue; end if;
    if char_length(d) > 40 then raise exception 'dish_too_long'; end if;
    if lower(d) = any (seen) then continue; end if;
    seen := seen || lower(d);
    res := res || d;
  end loop;
  if array_length(res, 1) > 10 then raise exception 'too_many_dishes'; end if;
  return res;
end $$;

/** Validates an audience (spec §8): my lists only; 'all' or 'only_me' must be alone; empty → All connections. */
create or replace function public.resolve_audience(p_owner uuid, p jsonb) returns uuid[]
language plpgsql stable security definer set search_path = public as $$
declare ids uuid[]; n_builtin int; n_total int;
begin
  select coalesce(array_agg(x::uuid), '{}') into ids from jsonb_array_elements_text(coalesce(p, '[]'::jsonb)) x;
  if coalesce(array_length(ids, 1), 0) = 0 then
    select array[id] into ids from audience_lists where owner = p_owner and kind = 'all';
    return ids;
  end if;
  select count(*) filter (where kind <> 'custom'), count(*) into n_builtin, n_total
    from audience_lists where id = any (ids) and owner = p_owner;
  if n_total <> array_length(ids, 1) then raise exception 'bad_audience'; end if;
  if n_builtin > 0 and n_total > 1 then raise exception 'bad_audience'; end if;
  return ids;
end $$;

-- RPCs (spec §22) ---------------------------------------------------------------------------
/**
 * Upsert my visit by client id (idempotent). p: id, place_id, visited_on, rating, loved, disliked,
 * price_per_person, notes, audience (list ids), companion_name_ids, new_companion_names.
 * On insert, the place leaves my wishlist (spec §6.2). Returns { id, removed_from_wishlist }.
 */
create or replace function public.save_visit(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_id uuid := (p ->> 'id')::uuid;
  v_place text := p ->> 'place_id';
  v_date date := (p ->> 'visited_on')::date;
  v_price int := nullif(p ->> 'price_per_person', '')::int;
  v_notes text := nullif(trim(coalesce(p ->> 'notes', '')), '');
  existing uuid;
  is_new boolean;
  aud uuid[];
  cid uuid;
  nm text;
  removed boolean := false;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if v_id is null then raise exception 'bad_id'; end if;
  if not exists (select 1 from places where place_id = v_place) then raise exception 'unknown_place'; end if;
  if v_date is null or v_date > (now() at time zone 'Asia/Kolkata')::date then raise exception 'bad_date'; end if;
  if (p ->> 'rating') is null then raise exception 'rating_required'; end if;
  if v_price is not null and (v_price < 1 or v_price > 50000) then raise exception 'bad_price'; end if;
  if v_notes is not null and char_length(v_notes) > 500 then raise exception 'notes_too_long'; end if;

  select author into existing from visits where id = v_id;
  if existing is not null and existing <> me then raise exception 'not_owner'; end if;
  is_new := existing is null;

  insert into visits (id, author, place_id, visited_on, rating, loved, disliked, price_per_person, notes)
  values (v_id, me, v_place, v_date, (p ->> 'rating')::rating, clean_dishes(p -> 'loved'), clean_dishes(p -> 'disliked'), v_price, v_notes)
  on conflict (id) do update set
    place_id = excluded.place_id, visited_on = excluded.visited_on, rating = excluded.rating,
    loved = excluded.loved, disliked = excluded.disliked, price_per_person = excluded.price_per_person, notes = excluded.notes;

  aud := resolve_audience(me, p -> 'audience');
  delete from visit_audience where visit_id = v_id;
  insert into visit_audience (visit_id, list_id) select v_id, unnest(aud);

  delete from visit_companion_names where visit_id = v_id;
  for cid in select x::uuid from jsonb_array_elements_text(coalesce(p -> 'companion_name_ids', '[]'::jsonb)) x loop
    if exists (select 1 from companion_names where id = cid and owner = me) then
      insert into visit_companion_names values (v_id, cid) on conflict do nothing;
    end if;
  end loop;
  for nm in select trim(x) from jsonb_array_elements_text(coalesce(p -> 'new_companion_names', '[]'::jsonb)) x loop
    if nm = '' then continue; end if;
    if char_length(nm) > 40 then raise exception 'name_too_long'; end if;
    insert into companion_names (owner, name) values (me, nm) on conflict (owner, lower(name)) do nothing;
    select id into cid from companion_names where owner = me and lower(name) = lower(nm);
    insert into visit_companion_names values (v_id, cid) on conflict do nothing;
  end loop;

  if is_new then
    delete from wishlist_items where owner = me and place_id = v_place;
    removed := found;
  end if;
  return jsonb_build_object('id', v_id, 'removed_from_wishlist', removed);
end $$;

create or replace function public.delete_visit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from visits where id = p_id and author = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.set_wishlist(p_place_id text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_on then
    if not exists (select 1 from places where place_id = p_place_id) then raise exception 'unknown_place'; end if;
    insert into wishlist_items (owner, place_id) values (auth.uid(), p_place_id) on conflict do nothing;
  else
    delete from wishlist_items where owner = auth.uid() and place_id = p_place_id;
  end if;
end $$;

create or replace function public.set_wishlist_audience(p_list_ids jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare aud uuid[];
begin
  aud := resolve_audience(auth.uid(), p_list_ids);
  delete from wishlist_audience where owner = auth.uid();
  insert into wishlist_audience (owner, list_id) select auth.uid(), unnest(aud);
end $$;

/** Companion names shown on a visit: for the author, their private names (tag partners join in M7). */
create or replace function public.visit_companions(p_visit uuid, p_author uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select case when p_author = auth.uid() then
    coalesce((select array_agg(c.name order by c.name) from visit_companion_names vc join companion_names c on c.id = vc.companion_name_id where vc.visit_id = p_visit), '{}')
  else '{}' end;
$$;

/** Audience summary for my own visits / wishlist ("All connections", "Only me", or list names). */
create or replace function public.audience_names(p_lists uuid[]) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(name order by kind, name), '{}') from audience_lists where id = any (p_lists) and owner = auth.uid();
$$;

/**
 * Home timeline (spec §22.5), newest first by creation time, keyset paginated.
 * Filter: all · connections · mine (friends · internet arrive in M5).
 */
create or replace function public.home_feed(p_filter text default 'all', p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
returns table (
  entry_type text, id uuid, created_at timestamptz, author_id uuid, author_name text, author_avatar text, is_mine boolean,
  place_id text, place_name text, place_area text, place_category public.place_category,
  rating public.rating, loved text[], disliked text[], price_per_person int, visited_on date, companions text[], is_private boolean
)
language sql stable security definer set search_path = public as $$
  select 'visit', v.id, v.created_at, v.author, pr.display_name, pr.avatar_url, v.author = auth.uid(),
         v.place_id, pl.name, pl.area, pl.category,
         v.rating, v.loved, v.disliked, v.price_per_person, v.visited_on, public.visit_companions(v.id, v.author),
         (v.author = auth.uid() and exists (select 1 from visit_audience va join audience_lists l on l.id = va.list_id where va.visit_id = v.id and l.kind = 'only_me'))
  from visits v
  join profiles pr on pr.id = v.author
  join places pl on pl.place_id = v.place_id
  where public.can_see_visit(v.id)
    and case p_filter when 'mine' then v.author = auth.uid()
                      when 'connections' then v.author <> auth.uid()
                      when 'all' then true
                      else false end
    and (p_before is null or (v.created_at, v.id) < (p_before, p_before_id))
  order by v.created_at desc, v.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

/** Place page data (spec §22.5): wishlist state, my visits, visible visits by others. */
create or replace function public.place_page(p_place_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'on_wishlist', exists (select 1 from wishlist_items where owner = auth.uid() and place_id = p_place_id),
    'my_visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'visited_on', v.visited_on, 'rating', v.rating) order by v.visited_on desc, v.created_at desc)
                           from visits v where v.place_id = p_place_id and v.author = auth.uid()), '[]'::jsonb),
    'people_visits', coalesce((select jsonb_agg(jsonb_build_object(
                           'id', v.id, 'author_id', v.author, 'author_name', pr.display_name, 'author_avatar', pr.avatar_url,
                           'rating', v.rating, 'loved', v.loved, 'disliked', v.disliked, 'price_per_person', v.price_per_person,
                           'visited_on', v.visited_on, 'companions', public.visit_companions(v.id, v.author)) order by v.created_at desc)
                         from visits v join profiles pr on pr.id = v.author
                         where v.place_id = p_place_id and v.author <> auth.uid() and public.can_see_visit(v.id)), '[]'::jsonb)
  );
$$;

/** One entry in full (C2). M4: visits; saved entries join in M5. */
create or replace function public.entry_detail(p_type text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if p_type <> 'visit' or not public.can_see_visit(p_id) then return null; end if;
  select jsonb_build_object(
    'type', 'visit', 'id', v.id, 'is_mine', v.author = auth.uid(),
    'author_id', v.author, 'author_name', pr.display_name, 'author_avatar', pr.avatar_url,
    'place_id', v.place_id, 'place_name', pl.name, 'place_area', pl.area, 'place_category', pl.category,
    'visited_on', v.visited_on, 'rating', v.rating, 'loved', v.loved, 'disliked', v.disliked,
    'price_per_person', v.price_per_person, 'notes', v.notes, 'created_at', v.created_at,
    'companions', public.visit_companions(v.id, v.author),
    'companion_ids', case when v.author = auth.uid() then coalesce((select jsonb_agg(companion_name_id) from visit_companion_names where visit_id = v.id), '[]'::jsonb) end,
    'audience_ids', case when v.author = auth.uid() then coalesce((select jsonb_agg(list_id) from visit_audience where visit_id = v.id), '[]'::jsonb) end,
    'audience', case when v.author = auth.uid() then to_jsonb(public.audience_names(array(select list_id from visit_audience where visit_id = v.id))) end
  ) into r
  from visits v join profiles pr on pr.id = v.author join places pl on pl.place_id = v.place_id
  where v.id = p_id;
  return r;
end $$;

/** My wishlist (Profile tab), newest first. */
create or replace function public.my_wishlist() returns table (place_id text, name text, area text, category public.place_category, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.place_id, pl.name, pl.area, pl.category, w.created_at
  from wishlist_items w join places pl on pl.place_id = w.place_id
  where w.owner = auth.uid()
  order by w.created_at desc;
$$;

/** Counts on my profile, plus my lists with member counts for the audience picker. */
create or replace function public.my_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visits', (select count(*) from visits where author = auth.uid()),
    'wishlist', (select count(*) from wishlist_items where owner = auth.uid()),
    'connections', (select count(*) from connections where auth.uid() in (user_a, user_b))
  );
$$;

create or replace function public.my_lists() returns table (id uuid, kind public.list_kind, name text, members int)
language sql stable security definer set search_path = public as $$
  select l.id, l.kind, l.name,
         case l.kind when 'all' then (select count(*)::int from connections where auth.uid() in (user_a, user_b))
                     when 'only_me' then 0
                     else (select count(*)::int from list_members m where m.list_id = l.id) end
  from audience_lists l where l.owner = auth.uid()
  order by case l.kind when 'all' then 0 when 'only_me' then 2 else 1 end, l.name;
$$;

create or replace function public.my_wishlist_audience() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(list_id), '{}') from wishlist_audience where owner = auth.uid();
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'save_visit(jsonb)', 'delete_visit(uuid)', 'set_wishlist(text,boolean)', 'set_wishlist_audience(jsonb)',
    'home_feed(text,timestamptz,uuid,int)', 'place_page(text)', 'entry_detail(text,uuid)', 'my_wishlist()',
    'my_counts()', 'my_lists()', 'my_wishlist_audience()'
  ] loop
    execute format('revoke execute on function public.%s from anon', f);
  end loop;
end $$;
