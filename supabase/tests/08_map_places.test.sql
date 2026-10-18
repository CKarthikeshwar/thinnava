-- Map pins (spec §14 B2/B2a, §22.5 map_places, §21.3): only what I may see; layers, price, category and person filters.
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP's schema on the path, so the tests also run on the hosted project, where the CLI's
-- temporary login role is a member of postgres but doesn't use its rights by default.
set local role postgres;
set search_path to public, extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a8', 'a8@t.local'),  -- A: me
  ('00000000-0000-0000-0000-0000000000b8', 'b8@t.local'),  -- B: connected to A
  ('00000000-0000-0000-0000-0000000000c8', 'c8@t.local');  -- C: not connected to A
insert into public.places (place_id, name, lat, lng, category) values
  ('test:m1', 'Mine',        12.90, 77.60, 'restaurant'),
  ('test:m2', 'B public',    12.91, 77.61, 'cafe'),
  ('test:m3', 'B only me',   12.92, 77.62, 'restaurant'),
  ('test:m4', 'C visit',     12.93, 77.63, 'restaurant'),
  ('test:m5', 'My wish',     12.94, 77.64, 'bar'),
  ('test:m6', 'Friend tip',  12.95, 77.65, 'restaurant'),
  ('test:m7', 'Far away',    28.60, 77.20, 'restaurant'),
  ('test:m8', 'B wish',      12.96, 77.66, 'cafe'),
  ('test:m9', 'B tags A',    12.97, 77.67, 'restaurant');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.list(owner uuid, k text) returns uuid language sql as $$
  select id from public.audience_lists where owner = $1 and kind::text = $2;
$$;
create function pg_temp.pins(layers text[] default null, price text default null, cats public.place_category[] default null, person uuid default null)
returns text[] language sql as $$
  select coalesce(array_agg(place_id order by place_id), '{}') from public.map_places(12.0, 77.0, 13.5, 78.0, layers, price, cats, person);
$$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a8'); select public.create_profile('anu8', 'Anu');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b8'); select public.create_profile('bala8', 'Bala');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c8'); select public.create_profile('chitra8', 'Chitra');
set local role postgres;
insert into public.connections (user_a, user_b) values ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8');
insert into public.visits (id, author, place_id, visited_on, rating, price_per_person) values
  ('00000000-0000-0000-0000-00000000a801', '00000000-0000-0000-0000-0000000000a8', 'test:m1', current_date, 'good', 150),
  ('00000000-0000-0000-0000-00000000b801', '00000000-0000-0000-0000-0000000000b8', 'test:m2', current_date, 'good', 600),
  ('00000000-0000-0000-0000-00000000b802', '00000000-0000-0000-0000-0000000000b8', 'test:m3', current_date, 'good', 300),
  ('00000000-0000-0000-0000-00000000c801', '00000000-0000-0000-0000-0000000000c8', 'test:m4', current_date, 'good', 300),
  ('00000000-0000-0000-0000-00000000b803', '00000000-0000-0000-0000-0000000000b8', 'test:m7', current_date, 'good', 300),
  ('00000000-0000-0000-0000-00000000c802', '00000000-0000-0000-0000-0000000000c8', 'test:m9', current_date, 'good', 300);
insert into public.visit_audience (visit_id, list_id) values
  ('00000000-0000-0000-0000-00000000a801', pg_temp.list('00000000-0000-0000-0000-0000000000a8', 'all')),
  ('00000000-0000-0000-0000-00000000b801', pg_temp.list('00000000-0000-0000-0000-0000000000b8', 'all')),
  ('00000000-0000-0000-0000-00000000b802', pg_temp.list('00000000-0000-0000-0000-0000000000b8', 'only_me')),
  ('00000000-0000-0000-0000-00000000c801', pg_temp.list('00000000-0000-0000-0000-0000000000c8', 'all')),
  ('00000000-0000-0000-0000-00000000b803', pg_temp.list('00000000-0000-0000-0000-0000000000b8', 'all')),
  ('00000000-0000-0000-0000-00000000c802', pg_temp.list('00000000-0000-0000-0000-0000000000c8', 'all'));
-- C (a stranger) tags A on m9; pending, so it must never put a pin on A's map.
insert into public.tags (visit_id, tagger, tagged) values ('00000000-0000-0000-0000-00000000c802', '00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000a8');
insert into public.wishlist_items (owner, place_id) values
  ('00000000-0000-0000-0000-0000000000a8', 'test:m5'), ('00000000-0000-0000-0000-0000000000b8', 'test:m8');
insert into public.wishlist_audience (owner, list_id) values ('00000000-0000-0000-0000-0000000000b8', pg_temp.list('00000000-0000-0000-0000-0000000000b8', 'all'))
  on conflict do nothing;
insert into public.friend_names (id, owner, name) values ('00000000-0000-0000-0000-00000000f801', '00000000-0000-0000-0000-0000000000a8', 'Rahul');
insert into public.saved_entries (id, owner, kind, place_id, friend_name_id, price_per_person)
  values ('00000000-0000-0000-0000-00000000e801', '00000000-0000-0000-0000-0000000000a8', 'friend', 'test:m6', '00000000-0000-0000-0000-00000000f801', 1200);
set local role authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a8');
select is(pg_temp.pins(), array['test:m1','test:m2','test:m5','test:m6'], 'A''s map: own visit, B''s shared visit, wishlist and friend tip; not B''s only-me visit, not a stranger''s, not a pending tag');
select is(pg_temp.pins(array['visited']), array['test:m1'], 'Visited layer = my visits');
select is(pg_temp.pins(array['connections']), array['test:m2'], 'Connections layer = what connections shared with me');
select is(pg_temp.pins(array['wishlist']), array['test:m5'], 'Wishlist layer = my wishlist');
select is(pg_temp.pins(array['friends']), array['test:m6'], 'Friends layer = my friend entries');
select is(pg_temp.pins(array['internet']), '{}'::text[], 'Internet layer is empty here');
select is((select array_agg(place_id) from public.map_places(28.0, 77.0, 29.0, 78.0)), array['test:m7'], 'only places inside the visible box (looking at Delhi shows only B''s Delhi visit)');
select is((select layers from public.map_places(12.0, 77.0, 13.5, 78.0) where place_id = 'test:m2'), array['connections'], 'rows carry their layers');
select is((select people -> 0 ->> 'name' from public.map_places(12.0, 77.0, 13.5, 78.0) where place_id = 'test:m2'), 'Bala', 'rows carry who went');
select is((select is_mine from public.map_places(12.0, 77.0, 13.5, 78.0) where place_id = 'test:m1'), true, 'is_mine marks my visits');
-- Filters (§14 B2a)
select is(pg_temp.pins(null, 'u200'), array['test:m1'], 'price: a place matches if any visible entry is in the bucket');
select is(pg_temp.pins(null, '1000'), array['test:m6'], 'price uses friend entries too; places with no price are hidden');
select is(pg_temp.pins(null, null, array['cafe']::public.place_category[]), array['test:m2'], 'category filter');
-- A connection's map
select is(pg_temp.pins(null, null, null, '00000000-0000-0000-0000-0000000000b8'), array['test:m2','test:m8'], 'B''s map: their shared visit and shared wishlist only, nothing of mine');
select is(pg_temp.pins(null, null, null, '00000000-0000-0000-0000-0000000000c8'), '{}'::text[], 'a non-connection''s map is empty');
-- A stranger sees nothing of A.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c8');
select ok(not ('test:m1' = any(pg_temp.pins())) and not ('test:m5' = any(pg_temp.pins())), 'a non-connection gets none of A''s pins');

select * from finish();
rollback;
