-- Security review 2026-10-18 (spec §21.1 "Who may call functions", changelog).
-- Functions were executable by everyone through the default PUBLIC grant, signed-out visitors included, and the helpers
-- that answer questions about any two people were open to signed-in users. With two user ids anyone could learn whether
-- they are connected, whether one blocked the other, or whether someone is in a private list.

-- 1. Signed-out visitors can't call any of our functions; nothing in the app needs one before sign-in.
--    Extension functions (citext, …) are left alone. Future functions don't get the PUBLIC / anon grant either.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- 2. Two-person helpers: only other functions (which run as the owner) may call them, never the API.
revoke execute on function
  public.is_connected(uuid, uuid),
  public.has_blocked(uuid, uuid),
  public.in_audience(uuid, uuid, uuid[]),
  public.resolve_audience(uuid, jsonb),
  public.can_see_visit_as(uuid, uuid),
  public.can_see_visit_social(uuid, uuid)
from authenticated;

-- 3. The two table rules that used them now ask only about the signed-in user, through helpers in a schema the API
--    doesn't expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.blocked_me(p_user uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$ select public.has_blocked(p_user, auth.uid()) $$;

create function private.connected_to(p_user uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$ select public.is_connected(auth.uid(), p_user) $$;

revoke all on function private.blocked_me(uuid), private.connected_to(uuid) from public;
grant execute on function private.blocked_me(uuid), private.connected_to(uuid) to authenticated;

alter policy profiles_select on public.profiles to authenticated using (not private.blocked_me(id));
alter policy details_select on public.profile_details to authenticated using (user_id = auth.uid() or private.connected_to(user_id));

-- 4. A saved entry's link is a web address (the app only opens http and https).
alter table public.saved_entries
  add constraint saved_entries_link_http check (source_url is null or source_url ~* '^https?://');
