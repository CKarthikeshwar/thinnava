-- M7: companion tags and notifications. Spec §7, §12, §20–§22.
-- Push delivery (push function + webhook on notifications INSERT) is wired in a later migration.

create type public.tag_status as enum ('pending', 'accepted');
create type public.notif_type as enum ('connect_request', 'connect_accepted', 'tag_request', 'connection_visited', 'wishlist_visited');

create table public.tags (
  id              uuid primary key default gen_random_uuid(),
  visit_id        uuid not null references public.visits on delete cascade,   -- the tagger's visit
  tagger          uuid not null references public.profiles on delete cascade,
  tagged          uuid not null references public.profiles on delete cascade,
  status          public.tag_status not null default 'pending',
  tagged_visit_id uuid references public.visits on delete cascade,            -- the tagged person's visit, once accepted
  created_at      timestamptz not null default now(),
  unique (visit_id, tagged),
  check (tagger <> tagged)
);
create index tags_tagged on public.tags (tagged);
create index tags_tagged_visit on public.tags (tagged_visit_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  recipient  uuid not null references public.profiles on delete cascade,
  type       public.notif_type not null,
  actor      uuid references public.profiles on delete cascade,
  visit_id   uuid references public.visits on delete cascade,
  tag_id     uuid references public.tags on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index notifications_recipient on public.notifications (recipient, created_at desc);

create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.tags          enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens   enable row level security;

-- Visibility (§5.2): the classic rule, plus "tagged on that visit" (pending or accepted, that visit only) ----------
/** Author, or connected and in the visit's audience. Used for feeds and lists (a tag doesn't put a visit in your feed). */
create or replace function public.can_see_visit_social(p_visit uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from visits v
    where v.id = p_visit
      and (v.author = p_viewer
           or (public.is_connected(p_viewer, v.author)
               and public.in_audience(v.author, p_viewer, array(select list_id from visit_audience where visit_id = v.id))))
  );
$$;

create or replace function public.can_see_visit_as(p_visit uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_see_visit_social(p_visit, p_viewer)
      or exists (select 1 from tags t where t.visit_id = p_visit and t.tagged = p_viewer);
$$;

create or replace function public.can_see_visit(p_visit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_see_visit_as(p_visit, auth.uid());
$$;

-- RLS (§21.2): tags visible to tagger, tagged, or (accepted and the visit is visible); notifications to the recipient.
create policy tags_select on public.tags for select to authenticated
  using (auth.uid() in (tagger, tagged) or (status = 'accepted' and public.can_see_visit(visit_id)));
create policy notifications_select on public.notifications for select to authenticated using (recipient = auth.uid());
create policy push_tokens_select on public.push_tokens for select to authenticated using (user_id = auth.uid());

/** A person's name as the viewer may see it: "Someone" if they blocked the viewer (§21.2). */
create or replace function public.visible_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when public.has_blocked(p_user, auth.uid()) then 'Someone' else (select display_name from profiles where id = p_user) end;
$$;

/**
 * "with …" on a visit (§7): accepted tag partners' first names (both directions), plus for the author only
 * pending tags ("Anu · pending") and private companion names.
 */
create or replace function public.visit_companions(p_visit uuid, p_author uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(n order by o, n), '{}') from (
    select split_part(public.visible_name(t.tagged), ' ', 1) as n, 0 as o from tags t where t.visit_id = p_visit and t.status = 'accepted'
    union all
    select split_part(public.visible_name(t.tagger), ' ', 1), 0 from tags t where t.tagged_visit_id = p_visit and t.status = 'accepted'
    union all
    select split_part(public.visible_name(t.tagged), ' ', 1) || ' · pending', 1 from tags t
      where t.visit_id = p_visit and t.status = 'pending' and p_author = auth.uid()
    union all
    select c.name, 2 from visit_companion_names vc join companion_names c on c.id = vc.companion_name_id
      where vc.visit_id = p_visit and p_author = auth.uid()
  ) x;
$$;

/** Tag people on a visit, with ids (for tapping names and pre-filling D3). */
create or replace function public.visit_tags(p_visit uuid)
returns table (tag_id uuid, user_id uuid, name text, avatar_url text, status public.tag_status, direction text)
language sql stable security definer set search_path = public as $$
  select t.id, t.tagged, public.visible_name(t.tagged), case when public.has_blocked(t.tagged, auth.uid()) then null else p.avatar_url end, t.status, 'tagged'
  from tags t join profiles p on p.id = t.tagged
  where t.visit_id = p_visit and (t.status = 'accepted' or auth.uid() in (t.tagger, t.tagged))
  union all
  select t.id, t.tagger, public.visible_name(t.tagger), case when public.has_blocked(t.tagger, auth.uid()) then null else p.avatar_url end, t.status, 'tagger'
  from tags t join profiles p on p.id = t.tagger
  where t.tagged_visit_id = p_visit and t.status = 'accepted';
$$;

-- Notifications ----------------------------------------------------------------------------------
create or replace function public.notify(p_recipient uuid, p_type public.notif_type, p_actor uuid, p_visit uuid default null, p_tag uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (recipient, type, actor, visit_id, tag_id)
  select p_recipient, p_type, p_actor, p_visit, p_tag
  where p_recipient <> p_actor and not public.has_blocked(p_recipient, p_actor) and not public.has_blocked(p_actor, p_recipient);
$$;
revoke execute on function public.notify(uuid, public.notif_type, uuid, uuid, uuid) from public, anon, authenticated;

/** F1 rows, newest first, keyset paginated, with what each row needs to render and act. */
create or replace function public.notifications_page(p_before timestamptz default null, p_before_id uuid default null, p_limit int default 30)
returns table (id uuid, type public.notif_type, created_at timestamptz, read boolean,
               actor_id uuid, actor_name text, actor_avatar text, actor_relation text,
               visit_id uuid, place_id text, place_name text, tag_id uuid, tag_status public.tag_status)
language sql stable security definer set search_path = public as $$
  select n.id, n.type, n.created_at, n.read_at is not null,
         n.actor, public.visible_name(n.actor), case when public.has_blocked(n.actor, auth.uid()) then null else pr.avatar_url end,
         public.relation_to(n.actor),
         n.visit_id, v.place_id, pl.name, n.tag_id, t.status
  from notifications n
  left join profiles pr on pr.id = n.actor
  left join visits v on v.id = n.visit_id
  left join places pl on pl.place_id = v.place_id
  left join tags t on t.id = n.tag_id
  where n.recipient = auth.uid()
    and (p_before is null or (n.created_at, n.id) < (p_before, p_before_id))
  order by n.created_at desc, n.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where recipient = auth.uid() and read_at is null;
$$;

create or replace function public.unread_notifications() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where recipient = auth.uid() and read_at is null;
$$;

create or replace function public.register_push_token(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_token is null or p_token !~ '^ExponentPushToken\[.+\]$' then raise exception 'bad_token'; end if;
  insert into push_tokens (token, user_id, updated_at) values (p_token, auth.uid(), now())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

-- Connections now notify (§12). Same bodies as M6, plus notify() and clearing the request notification. ---------
create or replace function public.send_request(p_to uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_to = me or not exists (select 1 from profiles where id = p_to) then raise exception 'not_found'; end if;
  if public.has_blocked(me, p_to) or public.has_blocked(p_to, me) then raise exception 'blocked'; end if;
  if public.is_connected(me, p_to) then return 'connected'; end if;
  if exists (select 1 from connection_requests where from_user = p_to and to_user = me) then
    perform public.connect_pair(me, p_to);
    delete from declined_requests where (from_user = me and to_user = p_to) or (from_user = p_to and to_user = me);
    delete from notifications where recipient = me and actor = p_to and type = 'connect_request';
    perform public.notify(p_to, 'connect_accepted', me);
    return 'connected';
  end if;
  if exists (select 1 from declined_requests where from_user = me and to_user = p_to) then return 'requested'; end if;
  if not exists (select 1 from connection_requests where from_user = me and to_user = p_to) then
    insert into connection_requests (from_user, to_user) values (me, p_to);
    perform public.notify(p_to, 'connect_request', me);
  end if;
  return 'requested';
end $$;

create or replace function public.cancel_request(p_to uuid) returns void
language sql security definer set search_path = public as $$
  delete from connection_requests where from_user = auth.uid() and to_user = p_to;
  delete from declined_requests where from_user = auth.uid() and to_user = p_to;
  delete from notifications where recipient = p_to and actor = auth.uid() and type = 'connect_request';
$$;

create or replace function public.respond_request(p_from uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from connection_requests where from_user = p_from and to_user = auth.uid()) then raise exception 'not_found'; end if;
  delete from notifications where recipient = auth.uid() and actor = p_from and type = 'connect_request';
  if p_accept then
    perform public.connect_pair(auth.uid(), p_from);
    perform public.notify(p_from, 'connect_accepted', auth.uid());
  else
    insert into declined_requests (from_user, to_user) values (p_from, auth.uid()) on conflict do nothing;
    delete from connection_requests where from_user = p_from and to_user = auth.uid();
  end if;
end $$;

/** §5.3, now also removing pending tags in both directions. */
create or replace function public.block_user(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_other = auth.uid() or not exists (select 1 from profiles where id = p_other) then raise exception 'not_found'; end if;
  perform public.disconnect_pair(auth.uid(), p_other);
  delete from connection_requests where (from_user = auth.uid() and to_user = p_other) or (from_user = p_other and to_user = auth.uid());
  delete from declined_requests where (from_user = auth.uid() and to_user = p_other) or (from_user = p_other and to_user = auth.uid());
  delete from tags where status = 'pending' and ((tagger = auth.uid() and tagged = p_other) or (tagger = p_other and tagged = auth.uid()));
  delete from notifications where (recipient = auth.uid() and actor = p_other) or (recipient = p_other and actor = auth.uid());
  update friend_names set linked_user = null where owner = auth.uid() and linked_user = p_other;
  insert into blocks (blocker, blocked) values (auth.uid(), p_other) on conflict do nothing;
end $$;

-- Visits with tags (§7, §22.4) -------------------------------------------------------------------
/**
 * Upsert my visit (see M4) + tags: tag_user_ids (connections only; new tags notify), dropped tags removed,
 * accept_tag_id accepts a tag with this visit. On insert only: leaves the wishlist, and notifies opted-in
 * subscribers who can see the visit (wishlist variant wins). Returns { id, removed_from_wishlist }.
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
  v_accept uuid := nullif(p ->> 'accept_tag_id', '')::uuid;
  existing uuid;
  is_new boolean;
  aud uuid[];
  cid uuid;
  nm text;
  tag_ids uuid[];
  tid uuid;
  new_tag uuid;
  removed boolean := false;
  sub record;
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

  -- Tags: only when the key is present (so older clients and offline replays don't wipe tags).
  if p ? 'tag_user_ids' then
    select coalesce(array_agg(distinct x::uuid), '{}') into tag_ids from jsonb_array_elements_text(p -> 'tag_user_ids') x;
    foreach tid in array tag_ids loop
      if tid = me or not public.is_connected(me, tid) then raise exception 'not_connected'; end if;
    end loop;
    delete from tags where visit_id = v_id and tagger = me and tagged <> all (tag_ids);
    foreach tid in array tag_ids loop
      new_tag := null;
      insert into tags (visit_id, tagger, tagged) values (v_id, me, tid) on conflict (visit_id, tagged) do nothing returning id into new_tag;
      if new_tag is not null then perform public.notify(tid, 'tag_request', me, v_id, new_tag); end if;
    end loop;
  end if;

  if v_accept is not null then
    update tags set status = 'accepted', tagged_visit_id = v_id where id = v_accept and tagged = me and status = 'pending';
    if not found then raise exception 'tag_not_found'; end if;
  end if;

  if is_new then
    delete from wishlist_items where owner = me and place_id = v_place;
    removed := found;
    -- Activity (§12): opted-in subscribers who can see this visit; the wishlist variant wins.
    for sub in select s.subscriber from activity_subscriptions s where s.target = me loop
      if public.can_see_visit_social(v_id, sub.subscriber) then
        perform public.notify(sub.subscriber,
          case when exists (select 1 from wishlist_items w where w.owner = sub.subscriber and w.place_id = v_place)
               then 'wishlist_visited'::notif_type else 'connection_visited'::notif_type end, me, v_id);
      end if;
    end loop;
  end if;
  return jsonb_build_object('id', v_id, 'removed_from_wishlist', removed);
end $$;

/**
 * Tag request (E8): 'same' creates my visit copying the tagger's rating, dishes, price and notes (audience = my
 * All connections), accepts the tag and returns the new visit id. 'reject' removes the tag (the tagger isn't told).
 */
create or replace function public.respond_tag(p_tag_id uuid, p_action text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t tags%rowtype; v visits%rowtype; new_id uuid := gen_random_uuid(); all_id uuid;
begin
  select * into t from tags where id = p_tag_id and tagged = auth.uid();
  if t.id is null then raise exception 'tag_not_found'; end if;
  if p_action = 'reject' then
    delete from tags where id = p_tag_id;
    return null;
  end if;
  if p_action <> 'same' or t.status <> 'pending' then raise exception 'bad_action'; end if;
  select * into v from visits where id = t.visit_id;
  select id into all_id from audience_lists where owner = auth.uid() and kind = 'all';
  insert into visits (id, author, place_id, visited_on, rating, loved, disliked, price_per_person, notes)
  values (new_id, auth.uid(), v.place_id, v.visited_on, v.rating, v.loved, v.disliked, v.price_per_person, v.notes);
  insert into visit_audience (visit_id, list_id) values (new_id, all_id);
  delete from wishlist_items where owner = auth.uid() and place_id = v.place_id;
  update tags set status = 'accepted', tagged_visit_id = new_id where id = p_tag_id;
  return new_id;
end $$;

/** "Remove me from this visit" (§7.6): the link disappears from both visits; my own visit stays. */
create or replace function public.untag_me(p_tag_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from tags where id = p_tag_id and tagged = auth.uid();
  if not found then raise exception 'tag_not_found'; end if;
end $$;

/** E8 data: the tag, the tagger and their visit (visible to me through the tag). */
create or replace function public.tag_detail(p_tag_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', t.id, 'status', t.status, 'tagged_visit_id', t.tagged_visit_id,
    'tagger_id', t.tagger, 'tagger_name', public.visible_name(t.tagger), 'tagger_avatar', pr.avatar_url,
    'visit_id', v.id, 'place_id', v.place_id, 'place_name', pl.name, 'place_area', pl.area, 'place_category', pl.category,
    'visited_on', v.visited_on, 'rating', v.rating, 'loved', v.loved, 'disliked', v.disliked,
    'price_per_person', v.price_per_person, 'notes', v.notes)
  from tags t join visits v on v.id = t.visit_id join places pl on pl.place_id = v.place_id join profiles pr on pr.id = t.tagger
  where t.id = p_tag_id and t.tagged = auth.uid();
$$;

/** Pending tag requests for me (E8 list / Home), newest first. */
create or replace function public.my_tag_requests() returns table (tag_id uuid, tagger_name text, place_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, public.visible_name(t.tagger), pl.name, t.created_at
  from tags t join visits v on v.id = t.visit_id join places pl on pl.place_id = v.place_id
  where t.tagged = auth.uid() and t.status = 'pending'
  order by t.created_at desc;
$$;

-- Feeds and lists use the social rule (a tag shows one visit through E8, not in feeds). Bodies as before. ----------
create or replace function public.home_feed(p_filter text default 'all', p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
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
      and public.can_see_visit_social(v.id, auth.uid())
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
        where v.place_id = p_place_id and v.author <> auth.uid() and public.can_see_visit_social(v.id, auth.uid())
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

create or replace function public.user_visits(p_user uuid, p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
returns table (id uuid, created_at timestamptz, place_id text, place_name text, place_area text, place_category public.place_category,
               rating public.rating, visited_on date)
language sql stable security definer set search_path = public as $$
  select v.id, v.created_at, v.place_id, pl.name, pl.area, pl.category, v.rating, v.visited_on
  from visits v join places pl on pl.place_id = v.place_id
  where v.author = p_user and public.can_see_visit_social(v.id, auth.uid())
    and (p_before is null or (v.created_at, v.id) < (p_before, p_before_id))
  order by v.created_at desc, v.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.who_went(p_place_ids text[])
returns table (place_id text, people jsonb, count int, i_went boolean, prices int[])
language sql stable security definer set search_path = public as $$
  with seen as (
    select v.place_id, v.author, v.price_per_person, v.created_at
    from visits v
    where v.place_id = any (p_place_ids) and public.can_see_visit_social(v.id, auth.uid())
  ),
  saved as (
    select s.place_id, s.price_per_person from saved_entries s
    where s.owner = auth.uid() and s.place_id = any (p_place_ids)
  ),
  others as (
    select se.place_id, se.author, max(se.created_at) as last
    from seen se where se.author <> auth.uid() group by se.place_id, se.author
  )
  select pid,
         coalesce((select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.display_name, 'avatar', pr.avatar_url) order by o.last desc)
                   from (select * from others o2 where o2.place_id = pid order by o2.last desc limit 3) o join profiles pr on pr.id = o.author), '[]'::jsonb),
         (select count(*)::int from others o where o.place_id = pid),
         exists (select 1 from seen where seen.place_id = pid and seen.author = auth.uid()),
         coalesce(array(select price_per_person from seen where seen.place_id = pid and price_per_person is not null
                        union all select price_per_person from saved where saved.place_id = pid and price_per_person is not null), '{}')
  from unnest(p_place_ids) as pid
  where exists (select 1 from seen where seen.place_id = pid) or exists (select 1 from saved where saved.place_id = pid);
$$;

/** C2, now with tags (ids for tapping names, pre-filling D3) and my own tag on it (for "Remove me from this visit"). */
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
    'audience', case when v.author = auth.uid() then to_jsonb(public.audience_names(array(select list_id from visit_audience where visit_id = v.id))) end,
    'tags', coalesce((select jsonb_agg(to_jsonb(x)) from public.visit_tags(v.id) x), '[]'::jsonb),
    'my_tag', (select jsonb_build_object('id', t.id, 'status', t.status) from tags t where t.tagged = auth.uid() and (t.visit_id = v.id or t.tagged_visit_id = v.id) limit 1)
  ) into r
  from visits v join profiles pr on pr.id = v.author join places pl on pl.place_id = v.place_id
  where v.id = p_id;
  return r;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'can_see_visit_social(uuid,uuid)', 'can_see_visit_as(uuid,uuid)', 'visible_name(uuid)', 'visit_tags(uuid)',
    'notifications_page(timestamptz,uuid,int)', 'mark_notifications_read()', 'unread_notifications()',
    'register_push_token(text)', 'unregister_push_token(text)', 'respond_tag(uuid,text)', 'untag_me(uuid)',
    'tag_detail(uuid)', 'my_tag_requests()'
  ] loop
    execute format('revoke execute on function public.%s from anon', f);
  end loop;
end $$;
