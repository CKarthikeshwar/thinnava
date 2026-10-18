-- Wishlist = places I haven't visited (spec §9): set_wishlist ignores adds for visited places; user_wishlist says i_went.
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP's schema on the path, so the tests also run on the hosted project, where the CLI's
-- temporary login role is a member of postgres but doesn't use its rights by default.
set local role postgres;
set search_path to public, extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'a7@t.local'),  -- A: has been to w1
  ('00000000-0000-0000-0000-0000000000b7', 'b7@t.local');  -- B: connected to A, wishlists w1 and w2
insert into public.places (place_id, name, lat, lng) values ('test:w1', 'Koshy''s', 12.97, 77.6), ('test:w2', 'Toit', 12.98, 77.64);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a7'); select public.create_profile('anu7', 'Anu');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b7'); select public.create_profile('bala7', 'Bala');
set local role postgres;
insert into public.connections (user_a, user_b) values ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000b7');
insert into public.visits (id, author, place_id, visited_on, rating)
  values ('00000000-0000-0000-0000-00000000a701', '00000000-0000-0000-0000-0000000000a7', 'test:w1', current_date - 2, 'good');
set local role authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
select lives_ok($$ select public.set_wishlist('test:w1', true) $$, 'adding a visited place does not fail');
select is((select count(*)::int from public.wishlist_items where place_id = 'test:w1'), 0, '…but it is not added');
select public.set_wishlist('test:w2', true);
select is((select count(*)::int from public.wishlist_items where place_id = 'test:w2'), 1, 'an unvisited place is added');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b7');
select public.set_wishlist('test:w1', true);
select public.set_wishlist('test:w2', true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
select is((select i_went from public.user_wishlist('00000000-0000-0000-0000-0000000000b7') where place_id = 'test:w1'), true, 'a connection''s wishlist item I visited says i_went');
select is((select i_went from public.user_wishlist('00000000-0000-0000-0000-0000000000b7') where place_id = 'test:w2'), false, 'one I have not visited does not');
select is((select on_mine from public.user_wishlist('00000000-0000-0000-0000-0000000000b7') where place_id = 'test:w2'), true, 'on_mine still works');

select * from finish();
rollback;
