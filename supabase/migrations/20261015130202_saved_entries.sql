-- M5: friend & internet entries (always private to their owner). Spec §6.3–6.4, §20, §21.2, §22.4–22.5.
-- Linking a friend name to a connection (link_friend_name) arrives in M6.

create type public.saved_kind as enum ('friend', 'internet');

create table public.friend_names (
  id          uuid primary key,                       -- client-generated (can be added offline)
  owner       uuid not null references public.profiles on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  linked_user uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now()
);
create unique index friend_names_unique on public.friend_names (owner, lower(name));

create table public.saved_entries (
  id               uuid primary key,                  -- client-generated
  owner            uuid not null references public.profiles on delete cascade,
  kind             public.saved_kind not null,
  place_id         text not null references public.places,
  friend_name_id   uuid references public.friend_names on delete restrict,
  source_url       text check (char_length(source_url) <= 2000),
  rating           public.rating,
  loved            text[] not null default '{}',
  disliked         text[] not null default '{}',
  price_per_person int check (price_per_person between 1 and 50000),
  visited_on       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((kind = 'friend'   and friend_name_id is not null and source_url is null)
      or (kind = 'internet' and friend_name_id is null and visited_on is null))
);
create index saved_entries_owner_created on public.saved_entries (owner, created_at desc);
create index saved_entries_place on public.saved_entries (place_id);
create trigger saved_entries_touch before update on public.saved_entries for each row execute function public.touch_updated_at();

-- RLS (spec §21.2): owner only; writes go through the RPCs below.
alter table public.friend_names  enable row level security;
alter table public.saved_entries enable row level security;
create policy friend_names_select  on public.friend_names  for select to authenticated using (owner = auth.uid());
create policy saved_entries_select on public.saved_entries for select to authenticated using (owner = auth.uid());

-- Writes ---------------------------------------------------------------------------------------
/**
 * Upsert a friend or internet entry by client id (idempotent).
 * p: id, kind, place_id, friend_name_id | new_friend_name {id, name}, source_url, rating, loved, disliked, price_per_person, visited_on.
 * Returns { id, friend_name_id }.
 */
create or replace function public.save_saved_entry(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e_id uuid := (p ->> 'id')::uuid;
  e_kind saved_kind := (p ->> 'kind')::saved_kind;
  e_place text := p ->> 'place_id';
  e_price int := nullif(p ->> 'price_per_person', '')::int;
  e_date date := nullif(p ->> 'visited_on', '')::date;
  e_url text := nullif(trim(coalesce(p ->> 'source_url', '')), '');
  fn_id uuid := nullif(p ->> 'friend_name_id', '')::uuid;
  new_fn jsonb := p -> 'new_friend_name';
  nm text;
  existing uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if e_id is null or e_kind is null then raise exception 'bad_input'; end if;
  if not exists (select 1 from places where place_id = e_place) then raise exception 'unknown_place'; end if;
  if e_price is not null and (e_price < 1 or e_price > 50000) then raise exception 'bad_price'; end if;
  if e_date is not null and e_date > (now() at time zone 'Asia/Kolkata')::date then raise exception 'bad_date'; end if;

  select owner into existing from saved_entries where id = e_id;
  if existing is not null and existing <> me then raise exception 'not_owner'; end if;

  if e_kind = 'friend' then
    e_url := null;
    if fn_id is null and new_fn is not null and jsonb_typeof(new_fn) = 'object' then
      nm := regexp_replace(trim(coalesce(new_fn ->> 'name', '')), '\s+', ' ', 'g');
      if nm = '' then raise exception 'friend_name_required'; end if;
      if char_length(nm) > 40 then raise exception 'name_too_long'; end if;
      -- Same name (any case) reuses the existing row, so offline retries and typos of case don't duplicate.
      select id into fn_id from friend_names where owner = me and lower(name) = lower(nm);
      if fn_id is null then
        fn_id := coalesce(nullif(new_fn ->> 'id', '')::uuid, gen_random_uuid());
        insert into friend_names (id, owner, name) values (fn_id, me, nm)
        on conflict (id) do nothing;
      end if;
    end if;
    if fn_id is null or not exists (select 1 from friend_names where id = fn_id and owner = me) then
      raise exception 'friend_name_required';
    end if;
  else
    fn_id := null;
    e_date := null;
    if e_url is not null and e_url !~* '^https?://' then raise exception 'bad_url'; end if;
  end if;

  insert into saved_entries (id, owner, kind, place_id, friend_name_id, source_url, rating, loved, disliked, price_per_person, visited_on)
  values (e_id, me, e_kind, e_place, fn_id, e_url, (p ->> 'rating')::rating, clean_dishes(p -> 'loved'), clean_dishes(p -> 'disliked'), e_price, e_date)
  on conflict (id) do update set
    kind = excluded.kind, place_id = excluded.place_id, friend_name_id = excluded.friend_name_id, source_url = excluded.source_url,
    rating = excluded.rating, loved = excluded.loved, disliked = excluded.disliked,
    price_per_person = excluded.price_per_person, visited_on = excluded.visited_on;

  return jsonb_build_object('id', e_id, 'friend_name_id', fn_id);
end $$;

create or replace function public.delete_saved_entry(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from saved_entries where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

/** Adds a friend name without an entry (D6 "Add '<text>' as a new name"). Returns the id (existing one if the name exists). */
create or replace function public.add_friend_name(p_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'); fid uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if nm = '' then raise exception 'friend_name_required'; end if;
  if char_length(nm) > 40 then raise exception 'name_too_long'; end if;
  select id into fid from friend_names where owner = auth.uid() and lower(name) = lower(nm);
  if fid is not null then return fid; end if;
  insert into friend_names (id, owner, name) values (coalesce(p_id, gen_random_uuid()), auth.uid(), nm) returning id into fid;
  return fid;
end $$;

create or replace function public.rename_friend_name(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if nm = '' then raise exception 'friend_name_required'; end if;
  if char_length(nm) > 40 then raise exception 'name_too_long'; end if;
  if exists (select 1 from friend_names where owner = auth.uid() and lower(name) = lower(nm) and id <> p_id) then
    raise exception 'name_taken';
  end if;
  update friend_names set name = nm where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

/** Merge: moves every entry of p_from to p_into, then deletes p_from (spec §22.4). */
create or replace function public.merge_friend_names(p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_from = p_into then raise exception 'same_name'; end if;
  if (select count(*) from friend_names where id in (p_from, p_into) and owner = auth.uid()) <> 2 then raise exception 'not_found'; end if;
  update saved_entries set friend_name_id = p_into where friend_name_id = p_from and owner = auth.uid();
  delete from friend_names where id = p_from and owner = auth.uid();
end $$;

/** Delete only when no entry uses the name (spec F4). */
create or replace function public.delete_friend_name(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from saved_entries where friend_name_id = p_id) then raise exception 'name_in_use'; end if;
  delete from friend_names where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

-- Reads ----------------------------------------------------------------------------------------
/** My friend names with entry counts, most recently used first (D6 chips, F4 list). */
create or replace function public.my_friend_names() returns table (id uuid, name text, entries int, last_used timestamptz, linked_username text)
language sql stable security definer set search_path = public as $$
  select f.id, f.name,
         (select count(*)::int from saved_entries s where s.friend_name_id = f.id),
         greatest(f.created_at, (select max(s.created_at) from saved_entries s where s.friend_name_id = f.id)),
         (select username::text from profiles where id = f.linked_user)
  from friend_names f where f.owner = auth.uid()
  order by 4 desc, f.name;
$$;

/**
 * Home timeline (spec §22.5): my visits, visible connection visits and my saved entries,
 * newest first by creation time, keyset paginated. Filter: all · connections · friends · internet · mine.
 */
drop function if exists public.home_feed(text, timestamptz, uuid, int);
create function public.home_feed(p_filter text default 'all', p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
returns table (
  entry_type text, id uuid, created_at timestamptz, author_id uuid, author_name text, author_avatar text, is_mine boolean,
  place_id text, place_name text, place_area text, place_category public.place_category,
  rating public.rating, loved text[], disliked text[], price_per_person int, visited_on date, companions text[], is_private boolean,
  friend_name text, source_url text
)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'visit'::text, v.id, v.created_at, v.author, pr.display_name, pr.avatar_url, v.author = auth.uid(),
           v.place_id, pl.name, pl.area, pl.category,
           v.rating, v.loved, v.disliked, v.price_per_person, v.visited_on, public.visit_companions(v.id, v.author),
           (v.author = auth.uid() and exists (select 1 from visit_audience va join audience_lists l on l.id = va.list_id where va.visit_id = v.id and l.kind = 'only_me')),
           null::text, null::text
    from visits v
    join profiles pr on pr.id = v.author
    join places pl on pl.place_id = v.place_id
    where p_filter in ('all', 'mine', 'connections')
      and public.can_see_visit(v.id)
      and case p_filter when 'mine' then v.author = auth.uid() when 'connections' then v.author <> auth.uid() else true end
      and (p_before is null or (v.created_at, v.id) < (p_before, p_before_id))
    union all
    select s.kind::text, s.id, s.created_at, s.owner, null, null, true,
           s.place_id, pl.name, pl.area, pl.category,
           s.rating, s.loved, s.disliked, s.price_per_person, s.visited_on, '{}'::text[], true,
           f.name, s.source_url
    from saved_entries s
    join places pl on pl.place_id = s.place_id
    left join friend_names f on f.id = s.friend_name_id
    where s.owner = auth.uid()
      and case p_filter when 'all' then true when 'friends' then s.kind = 'friend' when 'internet' then s.kind = 'internet' else false end
      and (p_before is null or (s.created_at, s.id) < (p_before, p_before_id))
  ) t
  order by 3 desc, 2 desc
  limit least(greatest(p_limit, 1), 50);
$$;

/** Place page (spec §22.5): wishlist state, my visits, then others' visible visits and my saved entries, newest first. */
create or replace function public.place_page(p_place_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'on_wishlist', exists (select 1 from wishlist_items where owner = auth.uid() and place_id = p_place_id),
    'my_visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'visited_on', v.visited_on, 'rating', v.rating) order by v.visited_on desc, v.created_at desc)
                           from visits v where v.place_id = p_place_id and v.author = auth.uid()), '[]'::jsonb),
    'people_visits', coalesce((select jsonb_agg(x.j order by x.created_at desc) from (
        select v.created_at, jsonb_build_object(
                 'entry_type', 'visit', 'id', v.id, 'author_id', v.author, 'author_name', pr.display_name, 'author_avatar', pr.avatar_url,
                 'rating', v.rating, 'loved', v.loved, 'disliked', v.disliked, 'price_per_person', v.price_per_person,
                 'visited_on', v.visited_on, 'companions', public.visit_companions(v.id, v.author)) as j
        from visits v join profiles pr on pr.id = v.author
        where v.place_id = p_place_id and v.author <> auth.uid() and public.can_see_visit(v.id)
        union all
        select s.created_at, jsonb_build_object(
                 'entry_type', s.kind, 'id', s.id, 'friend_name', f.name, 'source_url', s.source_url,
                 'rating', s.rating, 'loved', s.loved, 'disliked', s.disliked, 'price_per_person', s.price_per_person,
                 'visited_on', s.visited_on, 'companions', '[]'::jsonb)
        from saved_entries s left join friend_names f on f.id = s.friend_name_id
        where s.place_id = p_place_id and s.owner = auth.uid()
      ) x), '[]'::jsonb)
  );
$$;

/** One entry in full (C2). p_type: 'visit' or 'saved'. */
create or replace function public.entry_detail(p_type text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if p_type = 'saved' then
    select jsonb_build_object(
      'type', s.kind, 'id', s.id, 'is_mine', true,
      'friend_name', f.name, 'friend_name_id', s.friend_name_id, 'source_url', s.source_url,
      'place_id', s.place_id, 'place_name', pl.name, 'place_area', pl.area, 'place_category', pl.category,
      'visited_on', s.visited_on, 'rating', s.rating, 'loved', s.loved, 'disliked', s.disliked,
      'price_per_person', s.price_per_person, 'created_at', s.created_at
    ) into r
    from saved_entries s join places pl on pl.place_id = s.place_id left join friend_names f on f.id = s.friend_name_id
    where s.id = p_id and s.owner = auth.uid();
    return r;
  end if;
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

/** Profile Saved tab (spec §22.5 my_saved): my friend and internet entries, newest first, keyset paginated. */
create or replace function public.my_saved(p_kind text default null, p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
returns table (id uuid, kind public.saved_kind, created_at timestamptz, place_id text, place_name text, place_area text, place_category public.place_category,
               rating public.rating, friend_name text, source_url text)
language sql stable security definer set search_path = public as $$
  select s.id, s.kind, s.created_at, s.place_id, pl.name, pl.area, pl.category, s.rating, f.name, s.source_url
  from saved_entries s join places pl on pl.place_id = s.place_id left join friend_names f on f.id = s.friend_name_id
  where s.owner = auth.uid()
    and (p_kind is null or s.kind::text = p_kind)
    and (p_before is null or (s.created_at, s.id) < (p_before, p_before_id))
  order by s.created_at desc, s.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

/** Counts on my profile and the delete-account screen. */
create or replace function public.my_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visits', (select count(*) from visits where author = auth.uid()),
    'wishlist', (select count(*) from wishlist_items where owner = auth.uid()),
    'connections', (select count(*) from connections where auth.uid() in (user_a, user_b)),
    'saved', (select count(*) from saved_entries where owner = auth.uid())
  );
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'save_saved_entry(jsonb)', 'delete_saved_entry(uuid)', 'add_friend_name(uuid,text)', 'rename_friend_name(uuid,text)',
    'merge_friend_names(uuid,uuid)', 'delete_friend_name(uuid)', 'my_friend_names()',
    'home_feed(text,timestamptz,uuid,int)', 'place_page(text)', 'entry_detail(text,uuid)',
    'my_saved(text,timestamptz,uuid,int)', 'my_counts()'
  ] loop
    execute format('revoke execute on function public.%s from anon', f);
  end loop;
end $$;
