-- M6: connections, blocks, custom lists, list prompts, activity subscriptions. Spec §5, §8, §20–§22.
-- Notification rows (connect_request / connect_accepted) arrive with the notifications table in M7.

create table public.connection_requests (
  from_user  uuid references public.profiles on delete cascade,
  to_user    uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
create index connection_requests_to on public.connection_requests (to_user);

create table public.list_prompts (               -- E5 "add to lists" sheet still to show
  user_id    uuid references public.profiles on delete cascade,
  other_user uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_user)
);

create table public.activity_subscriptions (     -- the 🔔 toggle per connection (pushes arrive in M7)
  subscriber uuid references public.profiles on delete cascade,
  target     uuid references public.profiles on delete cascade,
  primary key (subscriber, target)
);

-- Silent declines (§5.1): the receiver's inbox drops it; the sender keeps seeing "Requested" until they cancel.
create table public.declined_requests (
  from_user  uuid references public.profiles on delete cascade,
  to_user    uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
alter table public.declined_requests enable row level security;
-- Only the sender may see it (so the receiver's decline stays silent and the sender sees "Requested").
create policy declined_select on public.declined_requests for select to authenticated using (from_user = auth.uid());

alter table public.connection_requests    enable row level security;
alter table public.list_prompts           enable row level security;
alter table public.activity_subscriptions enable row level security;
create policy requests_select on public.connection_requests for select to authenticated using (auth.uid() in (from_user, to_user));
create policy prompts_select  on public.list_prompts for select to authenticated using (user_id = auth.uid());
create policy subs_select     on public.activity_subscriptions for select to authenticated using (subscriber = auth.uid());

-- Helpers ----------------------------------------------------------------------------------
/** Relation of p_other to me: self · connected · requested (I asked, incl. silently declined) · incoming · blocked_by_me · none. */
create or replace function public.relation_to(p_other uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p_other = auth.uid() then 'self'
    when public.has_blocked(auth.uid(), p_other) then 'blocked_by_me'
    when public.is_connected(auth.uid(), p_other) then 'connected'
    when exists (select 1 from connection_requests where from_user = auth.uid() and to_user = p_other)
      or exists (select 1 from declined_requests where from_user = auth.uid() and to_user = p_other) then 'requested'
    when exists (select 1 from connection_requests where from_user = p_other and to_user = auth.uid()) then 'incoming'
    else 'none' end;
$$;

/** Makes the connection (pair ordered), clears requests both ways, and queues the E5 sheet for both. */
create or replace function public.connect_pair(a uuid, b uuid) returns void
language sql security definer set search_path = public as $$
  insert into connections (user_a, user_b) values (least(a, b), greatest(a, b)) on conflict do nothing;
  delete from connection_requests where (from_user = a and to_user = b) or (from_user = b and to_user = a);
  insert into list_prompts (user_id, other_user) values (a, b), (b, a) on conflict do nothing;
$$;
revoke execute on function public.connect_pair(uuid, uuid) from public, anon, authenticated;

/** Everything two people share, undone (remove connection / block). Accepted tags stay (§5.4). */
create or replace function public.disconnect_pair(a uuid, b uuid) returns void
language sql security definer set search_path = public as $$
  delete from connections where user_a = least(a, b) and user_b = greatest(a, b);
  delete from activity_subscriptions where (subscriber = a and target = b) or (subscriber = b and target = a);
  delete from list_members m using audience_lists l
    where m.list_id = l.id and ((l.owner = a and m.member_id = b) or (l.owner = b and m.member_id = a));
  delete from list_prompts where (user_id = a and other_user = b) or (user_id = b and other_user = a);
$$;
revoke execute on function public.disconnect_pair(uuid, uuid) from public, anon, authenticated;

-- People (§22.1) ---------------------------------------------------------------------------
/** Username prefix search (≥ 2 chars), excluding me and anyone who blocked me. Limit 20. */
create or replace function public.search_people(p_query text)
returns table (id uuid, username text, display_name text, avatar_url text, relation text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, public.relation_to(p.id)
  from profiles p
  where char_length(public.normalise_username(p_query)) >= 2
    and p.username::text like replace(replace(public.normalise_username(p_query), '_', '\_'), '%', '\%') || '%'
    and p.id <> auth.uid()
    and not public.has_blocked(p.id, auth.uid())
  order by p.username
  limit 20;
$$;

/** E1 / E2: everyone sees name, username, photo; connections also see bio, counts, the 🔔 state and my lists they're in. */
create or replace function public.profile_page(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare rel text; p profiles%rowtype;
begin
  select * into p from profiles where id = p_user;
  if p.id is null or public.has_blocked(p_user, auth.uid()) then return null; end if;
  rel := public.relation_to(p_user);
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'relation', rel)
    || case when rel = 'connected' then jsonb_build_object(
      'bio', (select bio from profile_details where user_id = p_user),
      'visits', (select count(*) from visits v where v.author = p_user and public.can_see_visit(v.id)),
      'wishlist_visible', public.can_see_wishlist(p_user),
      'notify', exists (select 1 from activity_subscriptions where subscriber = auth.uid() and target = p_user),
      'my_lists', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name) order by l.name)
                            from list_members m join audience_lists l on l.id = m.list_id
                            where m.member_id = p_user and l.owner = auth.uid()), '[]'::jsonb),
      'connected_at', (select created_at from connections where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user))
    ) else '{}'::jsonb end;
end $$;

/** A person's visits I may see, newest first, keyset paginated (E1 Visited tab). */
create or replace function public.user_visits(p_user uuid, p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
returns table (id uuid, created_at timestamptz, place_id text, place_name text, place_area text, place_category public.place_category,
               rating public.rating, visited_on date)
language sql stable security definer set search_path = public as $$
  select v.id, v.created_at, v.place_id, pl.name, pl.area, pl.category, v.rating, v.visited_on
  from visits v join places pl on pl.place_id = v.place_id
  where v.author = p_user and public.can_see_visit(v.id)
    and (p_before is null or (v.created_at, v.id) < (p_before, p_before_id))
  order by v.created_at desc, v.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

/** A person's wishlist, only if its audience includes me (E1 Wishlist tab). */
create or replace function public.user_wishlist(p_user uuid)
returns table (place_id text, name text, area text, category public.place_category, created_at timestamptz, on_mine boolean)
language sql stable security definer set search_path = public as $$
  select w.place_id, pl.name, pl.area, pl.category, w.created_at,
         exists (select 1 from wishlist_items m where m.owner = auth.uid() and m.place_id = w.place_id)
  from wishlist_items w join places pl on pl.place_id = w.place_id
  where w.owner = p_user and public.can_see_wishlist(p_user)
  order by w.created_at desc;
$$;

-- Connections and blocks (§22.2) ------------------------------------------------------------
/** A new request after a silent decline would never reach them, so a pending decline stays (still "Requested"). */
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
    return 'connected';
  end if;
  if exists (select 1 from declined_requests where from_user = me and to_user = p_to) then return 'requested'; end if;
  insert into connection_requests (from_user, to_user) values (me, p_to) on conflict do nothing;
  return 'requested';
end $$;

/** Cancel also clears a silent decline, so a later request starts fresh. */
create or replace function public.cancel_request(p_to uuid) returns void
language sql security definer set search_path = public as $$
  delete from connection_requests where from_user = auth.uid() and to_user = p_to;
  delete from declined_requests where from_user = auth.uid() and to_user = p_to;
$$;

/** Accept → connection (+ E5 prompts for both). Decline → deleted silently; they still see "Requested" until they cancel. */
create or replace function public.respond_request(p_from uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from connection_requests where from_user = p_from and to_user = auth.uid()) then raise exception 'not_found'; end if;
  if p_accept then
    perform public.connect_pair(auth.uid(), p_from);
  else
    -- Silent decline (§5.1): the request disappears from my inbox only; the sender keeps seeing "Requested".
    insert into declined_requests (from_user, to_user) values (p_from, auth.uid()) on conflict do nothing;
    delete from connection_requests where from_user = p_from and to_user = auth.uid();
  end if;
end $$;

create or replace function public.remove_connection(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_connected(auth.uid(), p_other) then raise exception 'not_connected'; end if;
  perform public.disconnect_pair(auth.uid(), p_other);
end $$;

/** §5.3: removes the connection, requests both ways and shared list memberships. Pending tags join in M7. */
create or replace function public.block_user(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_other = auth.uid() or not exists (select 1 from profiles where id = p_other) then raise exception 'not_found'; end if;
  perform public.disconnect_pair(auth.uid(), p_other);
  delete from connection_requests where (from_user = auth.uid() and to_user = p_other) or (from_user = p_other and to_user = auth.uid());
  delete from declined_requests where (from_user = auth.uid() and to_user = p_other) or (from_user = p_other and to_user = auth.uid());
  update friend_names set linked_user = null where owner = auth.uid() and linked_user = p_other;
  insert into blocks (blocker, blocked) values (auth.uid(), p_other) on conflict do nothing;
end $$;

/** Unblocking does not restore the connection (§5.3). */
create or replace function public.unblock_user(p_other uuid) returns void
language sql security definer set search_path = public as $$
  delete from blocks where blocker = auth.uid() and blocked = p_other;
$$;

create or replace function public.my_blocked() returns table (id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url from blocks b join profiles p on p.id = b.blocked
  where b.blocker = auth.uid() order by b.created_at desc;
$$;

create or replace function public.set_activity_notifications(p_target uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_connected(auth.uid(), p_target) then raise exception 'not_connected'; end if;
  if p_on then insert into activity_subscriptions values (auth.uid(), p_target) on conflict do nothing;
  else delete from activity_subscriptions where subscriber = auth.uid() and target = p_target; end if;
end $$;

/** E3 data: my connections, incoming requests and the requests I sent. */
create or replace function public.my_connections()
returns table (id uuid, username text, display_name text, avatar_url text, since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, c.created_at
  from connections c join profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  where auth.uid() in (c.user_a, c.user_b)
  order by p.display_name;
$$;

create or replace function public.my_requests()
returns table (id uuid, username text, display_name text, avatar_url text, direction text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, 'incoming', r.created_at
  from connection_requests r join profiles p on p.id = r.from_user where r.to_user = auth.uid()
  union all
  select p.id, p.username::text, p.display_name, p.avatar_url, 'outgoing', r.created_at
  from connection_requests r join profiles p on p.id = r.to_user where r.from_user = auth.uid()
  union all  -- declined ones still look pending to the sender (§5.1)
  select p.id, p.username::text, p.display_name, p.avatar_url, 'outgoing', d.created_at
  from declined_requests d join profiles p on p.id = d.to_user where d.from_user = auth.uid()
  order by 6 desc;
$$;

/** E5 queue: people I was newly connected to and haven't been asked about yet. */
create or replace function public.pending_list_prompts() returns table (id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url
  from list_prompts lp join profiles p on p.id = lp.other_user
  where lp.user_id = auth.uid() and public.is_connected(auth.uid(), lp.other_user)
  order by lp.created_at;
$$;

create or replace function public.dismiss_list_prompt(p_other uuid) returns void
language sql security definer set search_path = public as $$
  delete from list_prompts where user_id = auth.uid() and other_user = p_other;
$$;

-- Lists (§8, §22.3) ------------------------------------------------------------------------
create or replace function public.create_list(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'); lid uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if char_length(nm) not between 1 and 30 then raise exception 'list_name_invalid'; end if;
  if exists (select 1 from audience_lists where owner = auth.uid() and lower(name) = lower(nm)) then raise exception 'list_name_taken'; end if;
  if (select count(*) from audience_lists where owner = auth.uid() and kind = 'custom') >= 20 then raise exception 'too_many_lists'; end if;
  insert into audience_lists (owner, kind, name) values (auth.uid(), 'custom', nm) returning id into lid;
  return lid;
end $$;

create or replace function public.rename_list(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if char_length(nm) not between 1 and 30 then raise exception 'list_name_invalid'; end if;
  if exists (select 1 from audience_lists where owner = auth.uid() and lower(name) = lower(nm) and id <> p_id) then raise exception 'list_name_taken'; end if;
  update audience_lists set name = nm where id = p_id and owner = auth.uid() and kind = 'custom';
  if not found then raise exception 'not_found'; end if;
end $$;

/** Deleting never widens an audience (§8): visits and the wishlist left with no list fall back to Only me. */
create or replace function public.delete_list(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); only_me uuid;
begin
  if not exists (select 1 from audience_lists where id = p_id and owner = me and kind = 'custom') then raise exception 'not_found'; end if;
  select id into only_me from audience_lists where owner = me and kind = 'only_me';
  insert into visit_audience (visit_id, list_id)
    select va.visit_id, only_me from visit_audience va
    where va.list_id = p_id
      and not exists (select 1 from visit_audience o where o.visit_id = va.visit_id and o.list_id <> p_id)
  on conflict do nothing;
  if exists (select 1 from wishlist_audience where owner = me and list_id = p_id)
     and not exists (select 1 from wishlist_audience where owner = me and list_id <> p_id) then
    insert into wishlist_audience (owner, list_id) values (me, only_me) on conflict do nothing;
  end if;
  delete from audience_lists where id = p_id and owner = me;
end $$;

/** Replaces a custom list's members; members must be current connections. */
create or replace function public.set_list_members(p_id uuid, p_members uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if not exists (select 1 from audience_lists where id = p_id and owner = auth.uid() and kind = 'custom') then raise exception 'not_found'; end if;
  foreach m in array coalesce(p_members, '{}') loop
    if not public.is_connected(auth.uid(), m) then raise exception 'not_connected'; end if;
  end loop;
  delete from list_members where list_id = p_id and member_id <> all (coalesce(p_members, '{}'));
  insert into list_members (list_id, member_id) select p_id, unnest(coalesce(p_members, '{}')) on conflict do nothing;
end $$;

/** E5 / E1 "Add to lists": sets exactly which of my custom lists p_member is in. */
create or replace function public.add_to_lists(p_member uuid, p_list_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_connected(auth.uid(), p_member) then raise exception 'not_connected'; end if;
  if exists (select 1 from unnest(coalesce(p_list_ids, '{}')) x where not exists (select 1 from audience_lists where id = x and owner = auth.uid() and kind = 'custom')) then
    raise exception 'bad_list';
  end if;
  delete from list_members m using audience_lists l
    where m.list_id = l.id and l.owner = auth.uid() and l.kind = 'custom' and m.member_id = p_member and m.list_id <> all (coalesce(p_list_ids, '{}'));
  insert into list_members (list_id, member_id) select unnest(coalesce(p_list_ids, '{}')), p_member on conflict do nothing;
  delete from list_prompts where user_id = auth.uid() and other_user = p_member;
end $$;

create or replace function public.list_detail(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', l.id, 'name', l.name, 'kind', l.kind,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url) order by p.display_name)
                         from list_members m join profiles p on p.id = m.member_id where m.list_id = l.id), '[]'::jsonb),
    'visits', (select count(*) from visit_audience va where va.list_id = l.id))
  from audience_lists l where l.id = p_id and l.owner = auth.uid();
$$;

-- Friend names: link to a connection (§14 F4) -------------------------------------------------
create or replace function public.link_friend_name(p_id uuid, p_user uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is not null and not public.is_connected(auth.uid(), p_user) then raise exception 'not_connected'; end if;
  update friend_names set linked_user = p_user where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'relation_to(uuid)', 'search_people(text)', 'profile_page(uuid)', 'user_visits(uuid,timestamptz,uuid,int)', 'user_wishlist(uuid)',
    'send_request(uuid)', 'cancel_request(uuid)', 'respond_request(uuid,boolean)', 'remove_connection(uuid)', 'block_user(uuid)',
    'unblock_user(uuid)', 'my_blocked()', 'set_activity_notifications(uuid,boolean)', 'my_connections()', 'my_requests()',
    'pending_list_prompts()', 'dismiss_list_prompt(uuid)', 'create_list(text)', 'rename_list(uuid,text)', 'delete_list(uuid)',
    'set_list_members(uuid,uuid[])', 'add_to_lists(uuid,uuid[])', 'list_detail(uuid)', 'link_friend_name(uuid,uuid)'
  ] loop
    execute format('revoke execute on function public.%s from anon', f);
  end loop;
end $$;
