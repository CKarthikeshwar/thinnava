-- Visits & wishlist (spec §5.2, §6, §8, §9, §21.3).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@t.local'),  -- A: author
  ('00000000-0000-0000-0000-0000000000b1', 'b@t.local'),  -- B: connected to A, in A's "Close friends"
  ('00000000-0000-0000-0000-0000000000c1', 'c@t.local'),  -- C: not connected
  ('00000000-0000-0000-0000-0000000000d1', 'd@t.local');  -- D: connected to A, not in "Close friends"
insert into public.places (place_id, name, lat, lng) values ('test:p1', 'Bao Story', 12.97, 77.64), ('test:p2', 'Toit', 12.98, 77.64), ('test:p3', 'Koshy''s', 12.97, 77.6);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1'); select public.create_profile('anu', 'Anu');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1'); select public.create_profile('bharat', 'Bharat');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1'); select public.create_profile('chitra', 'Chitra');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1'); select public.create_profile('dev', 'Dev');
reset role;
insert into public.connections (user_a, user_b) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1');
insert into public.audience_lists (id, owner, kind, name) values ('00000000-0000-0000-0000-00000000c105', '00000000-0000-0000-0000-0000000000a1', 'custom', 'Close friends');
insert into public.list_members values ('00000000-0000-0000-0000-00000000c105', '00000000-0000-0000-0000-0000000000b1');
set local role authenticated;

-- A: wishlist p1, then three visits with different audiences.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.set_wishlist('test:p1', true);
select is((select (public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000aa01','place_id','test:p1','visited_on',current_date,'rating','good',
  'loved', jsonb_build_array('Chicken bao', 'chicken BAO', ' Noodles '), 'new_companion_names', jsonb_build_array('Mom'))) ->> 'removed_from_wishlist')::boolean), true,
  'a new visit removes the place from my wishlist');
select is((select loved from public.visits where id = '00000000-0000-0000-0000-00000000aa01'), array['Chicken bao','Noodles'], 'dishes trimmed and de-duplicated case-insensitively');
select is((select audience_names(array(select list_id from public.visit_audience where visit_id = '00000000-0000-0000-0000-00000000aa01'))), array['All connections'], 'empty audience defaults to All connections');
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000aa02','place_id','test:p2','visited_on',current_date,'rating','okayish',
  'audience', jsonb_build_array((select id from public.audience_lists where owner = auth.uid() and kind = 'only_me'))));
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000aa03','place_id','test:p2','visited_on',current_date,'rating','bad',
  'audience', jsonb_build_array('00000000-0000-0000-0000-00000000c105')));
select throws_ok($$ select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000aa04','place_id','test:p2','visited_on',current_date,'rating','good',
  'audience', jsonb_build_array((select id from public.audience_lists where owner = auth.uid() and kind = 'all'), '00000000-0000-0000-0000-00000000c105'))) $$,
  'P0001', 'bad_audience', 'All connections cannot be combined with another list');
select throws_ok($$ select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000aa05','place_id','test:p2','visited_on',current_date + 2,'rating','good')) $$,
  'P0001', 'bad_date', 'visit dates cannot be in the future');
select throws_ok($$ select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000aa06','place_id','test:p2','visited_on',current_date)) $$,
  'P0001', 'rating_required', 'my visits need a rating');
select is((select count(*)::int from public.home_feed('mine')), 3, 'A sees all three own visits');
select is((select companions from public.home_feed('mine') where id = '00000000-0000-0000-0000-00000000aa01'), array['Mom'], 'private companion name shown to the author');
-- A visited place can't go back on the wishlist (§9); an unvisited one can.
select public.set_wishlist('test:p1', true);
select is((select count(*)::int from public.wishlist_items where place_id = 'test:p1'), 0, 're-adding a visited place to the wishlist is ignored');
select public.set_wishlist('test:p3', true);

-- B (connected, in Close friends): sees All-connections + Close-friends visits, not Only-me.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.home_feed('connections')), 2, 'B sees the All-connections and Close-friends visits');
select is((select count(*)::int from public.visits where id = '00000000-0000-0000-0000-00000000aa02'), 0, 'B cannot see the Only-me visit');
select is((select companions from public.home_feed('connections') where id = '00000000-0000-0000-0000-00000000aa01'), '{}'::text[], 'private companion names are hidden from others');
select is((select count(*)::int from public.visit_audience), 0, 'B cannot read audience rows');
select is((select count(*)::int from public.wishlist_items), 1, 'B sees A''s wishlist (All connections)');
select throws_ok($$ select public.delete_visit('00000000-0000-0000-0000-00000000aa01') $$, 'P0001', 'not_found', 'B cannot delete A''s visit');

-- D (connected, not in Close friends): only the All-connections visit.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from public.home_feed('connections')), 1, 'D sees only the All-connections visit');

-- C (not connected): nothing.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.visits), 0, 'a non-connection sees no visits');
select is((select count(*)::int from public.wishlist_items), 0, 'a non-connection sees no wishlist');

select * from finish();
rollback;
