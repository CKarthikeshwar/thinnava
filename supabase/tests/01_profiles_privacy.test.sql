-- Privacy tests for profiles (spec §21.3). Run: npx supabase test db --linked  (or paste into the SQL editor).
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP's schema on the path, so the tests also run on the hosted project, where the CLI's
-- temporary login role is a member of postgres but doesn't use its rights by default.
set local role postgres;
set search_path to public, extensions;
select plan(12);

-- Three users: A, B, C. A and B are connected; C blocks A.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.create_profile('anu.eats', 'Anu') $$, 'A creates a profile');
select throws_ok($$ select public.create_profile('anu.eats2', 'Anu again') $$, 'P0001', 'profile_exists', 'A cannot create a second profile');
select is((select count(*)::int from public.audience_lists), 2, 'built-in lists created (All connections, Only me)');
select is((select count(*)::int from public.wishlist_audience), 1, 'wishlist audience defaults to one list');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.create_profile('ANU.EATS', 'Imposter') $$, 'P0001', 'username_taken', 'usernames are case-insensitive unique');
select throws_ok($$ select public.create_profile('_bad', 'B') $$, 'P0001', 'username_invalid', 'username rules enforced');
select lives_ok($$ select public.create_profile('bharat', 'Bharat') $$, 'B creates a profile');
select is(public.username_available('anu.eats'), false, 'taken username is not available');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.create_profile('chitra', 'Chitra') $$, 'C creates a profile');

-- A sets a bio; set up the A–B connection and C's block on A (as the table owner, bypassing RLS).
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.update_profile('anu.eats', 'Anu', 'Momo hunter');
set local role postgres;
insert into public.connections (user_a, user_b) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
insert into public.blocks (blocker, blocked) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');
set local role authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select bio from public.profile_details where user_id = '00000000-0000-0000-0000-00000000000a'), 'Momo hunter', 'a connection sees the bio');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.profile_details where user_id = '00000000-0000-0000-0000-00000000000a'), 0, 'a non-connection cannot see the bio');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 0, 'a blocked user cannot see the blocker''s profile');

select * from finish();
rollback;
