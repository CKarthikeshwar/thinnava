-- Who may call functions (spec §21.1, security review 2026-10-18): signed-out visitors call nothing; nobody probes the
-- two-person helpers through the API; the table rules that used them still work; saved links are web addresses.
begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set search_path to public, extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa', 'a10@t.local'),  -- Anu
  ('00000000-0000-0000-0000-0000000000bb', 'b10@t.local'),  -- Bharat (connected to Anu)
  ('00000000-0000-0000-0000-0000000000cc', 'c10@t.local');  -- Chitra (a stranger, later blocked by Anu)

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa'); select public.create_profile('anu10', 'Anu');
select public.update_profile('anu10', 'Anu', 'Dosa first');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000bb'); select public.create_profile('bharat10', 'Bharat');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000cc'); select public.create_profile('chitra10', 'Chitra');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa'); select public.send_request('00000000-0000-0000-0000-0000000000bb');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000bb'); select public.respond_request('00000000-0000-0000-0000-0000000000aa', true);

-- Signed-out visitors can't call our functions.
set local role anon;
select throws_ok($$ select public.is_connected('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000bb') $$,
  '42501', null, 'signed out: is_connected is refused');
select throws_ok($$ select public.profile_page('00000000-0000-0000-0000-0000000000aa') $$, '42501', null, 'signed out: profile_page is refused');
select throws_ok($$ select public.username_available('anu10') $$, '42501', null, 'signed out: username_available is refused');
select is((select count(*)::int from public.profiles), 0, 'signed out: no profiles');
select is((select count(*)::int from public.visits), 0, 'signed out: no visits');

-- Signed in, nobody can ask about two other people.
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000cc');
select throws_ok($$ select public.is_connected('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000bb') $$,
  '42501', null, 'is_connected is not callable through the API');
select throws_ok($$ select public.has_blocked('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000cc') $$,
  '42501', null, 'has_blocked is not callable');
select throws_ok($$ select public.in_audience('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000bb', '{}'::uuid[]) $$,
  '42501', null, 'in_audience is not callable');
select throws_ok($$ select public.resolve_audience('00000000-0000-0000-0000-0000000000aa', '[]'::jsonb) $$, '42501', null, 'resolve_audience is not callable');
select throws_ok($$ select public.can_see_visit_as(gen_random_uuid(), '00000000-0000-0000-0000-0000000000bb') $$, '42501', null, 'can_see_visit_as is not callable');
select throws_ok($$ select public.can_see_visit_social(gen_random_uuid(), '00000000-0000-0000-0000-0000000000bb') $$, '42501', null, 'can_see_visit_social is not callable');
select pass('private helpers are only reachable through table rules (the API exposes the public schema only)');

-- The table rules still work.
select is((select count(*)::int from public.profile_details where user_id = '00000000-0000-0000-0000-0000000000aa'), 0, 'a stranger still can''t see the bio');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000bb');
select is((select bio from public.profile_details where user_id = '00000000-0000-0000-0000-0000000000aa'), 'Dosa first', 'a connection still sees the bio');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000cc');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000aa'), 1, 'before a block, a stranger sees the name');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa'); select public.block_user('00000000-0000-0000-0000-0000000000cc');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000cc');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000aa'), 0, 'after the block, Anu''s profile is hidden from Chitra');

-- Saved links must be web addresses.
set local role postgres;
insert into public.places (place_id, name, lat, lng) values ('test:l1', 'Toit', 12.98, 77.64);
select lives_ok($$ insert into public.saved_entries (id, owner, kind, place_id, source_url) values
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000aa', 'internet', 'test:l1', 'https://example.com/reel') $$, 'an https link is fine');
select throws_ok($$ insert into public.saved_entries (id, owner, kind, place_id, source_url) values
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000aa', 'internet', 'test:l1', 'javascript:alert(1)') $$, '23514', null, 'a javascript: link is refused');

select * from finish();
rollback;
