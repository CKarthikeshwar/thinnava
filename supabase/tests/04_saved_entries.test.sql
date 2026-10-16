-- Friend & internet entries (spec §6.3–6.4, §21.3 "saved entries are never visible to others, even linked friends").
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'a2@t.local'),  -- A: owner
  ('00000000-0000-0000-0000-0000000000b2', 'b2@t.local');  -- B: connected to A, and A's friend name "Rahul" is linked to B
insert into public.places (place_id, name, lat, lng) values ('test:s1', 'Burger Factory', 12.93, 77.62), ('test:s2', 'Meghana Foods', 12.97, 77.6);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2'); select public.create_profile('anu2', 'Anu');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2'); select public.create_profile('rahulk', 'Rahul K');
reset role;
insert into public.connections (user_a, user_b) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b2');
set local role authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
-- Friend entry with a new friend name.
select is((select (public.save_saved_entry(jsonb_build_object('id','00000000-0000-0000-0000-00000000ee01','kind','friend','place_id','test:s1',
  'new_friend_name', jsonb_build_object('id','00000000-0000-0000-0000-00000000f001','name','  Rahul '),
  'rating','good','loved', jsonb_build_array('Chicken burger'),'disliked', jsonb_build_array('Shake'),'price_per_person',300,'visited_on', current_date - 5)) ->> 'friend_name_id')::uuid),
  '00000000-0000-0000-0000-00000000f001'::uuid, 'a new friend name is created with the client id');
select is((select name from public.friend_names where id = '00000000-0000-0000-0000-00000000f001'), 'Rahul', 'friend names are trimmed');
-- Same name in another case reuses the row.
select is((select (public.save_saved_entry(jsonb_build_object('id','00000000-0000-0000-0000-00000000ee02','kind','friend','place_id','test:s2',
  'new_friend_name', jsonb_build_object('id','00000000-0000-0000-0000-00000000f0ff','name','rahul'))) ->> 'friend_name_id')::uuid),
  '00000000-0000-0000-0000-00000000f001'::uuid, 'the same name in another case reuses the existing friend name');
select throws_ok($$ select public.save_saved_entry(jsonb_build_object('id','00000000-0000-0000-0000-00000000ee03','kind','friend','place_id','test:s1')) $$,
  'P0001', 'friend_name_required', 'a friend entry needs a friend name');
select throws_ok($$ select public.save_saved_entry(jsonb_build_object('id','00000000-0000-0000-0000-00000000ee04','kind','friend','place_id','test:s1',
  'friend_name_id','00000000-0000-0000-0000-00000000f001','visited_on', current_date + 3)) $$, 'P0001', 'bad_date', 'when they went cannot be in the future');
-- Internet entry: rating optional, link kept, date dropped.
select public.save_saved_entry(jsonb_build_object('id','00000000-0000-0000-0000-00000000ee05','kind','internet','place_id','test:s2',
  'source_url','https://www.instagram.com/reel/abc','visited_on', current_date));
select is((select visited_on from public.saved_entries where id = '00000000-0000-0000-0000-00000000ee05'), null, 'internet entries have no date');
select is((select rating from public.saved_entries where id = '00000000-0000-0000-0000-00000000ee05'), null, 'rating is optional on saved entries');
select throws_ok($$ select public.save_saved_entry(jsonb_build_object('id','00000000-0000-0000-0000-00000000ee06','kind','internet','place_id','test:s2','source_url','javascript:alert(1)')) $$,
  'P0001', 'bad_url', 'only http(s) links are stored');

select is((select count(*)::int from public.home_feed('all')), 3, 'my saved entries appear in my Home feed');
select is((select count(*)::int from public.home_feed('friends')), 2, 'From friends filter shows friend entries only');
select is((select count(*)::int from public.home_feed('internet')), 1, 'Internet filter shows internet entries only');
select is((select count(*)::int from public.home_feed('mine')), 0, 'Mine is my own visits only');
select is((select friend_name from public.home_feed('friends') where id = '00000000-0000-0000-0000-00000000ee01'), 'Rahul', 'feed rows carry the friend name');
select is((select jsonb_array_length(public.place_page('test:s1') -> 'people_visits')), 1, 'the place page lists my friend entry');
select is((select entries from public.my_friend_names() where id = '00000000-0000-0000-0000-00000000f001'), 2, 'friend names carry entry counts');

-- Merge and delete rules.
select public.add_friend_name('00000000-0000-0000-0000-00000000f002', 'Rahul S');
select public.merge_friend_names('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000f002');
select is((select count(*)::int from public.saved_entries where friend_name_id = '00000000-0000-0000-0000-00000000f002'), 2, 'merge moves every entry');
select throws_ok($$ select public.delete_friend_name('00000000-0000-0000-0000-00000000f002') $$, 'P0001', 'name_in_use', 'a name with entries cannot be deleted');

-- Even a linked, connected friend sees nothing.
reset role;
update public.friend_names set linked_user = '00000000-0000-0000-0000-0000000000b2' where id = '00000000-0000-0000-0000-00000000f002';
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.saved_entries) + (select count(*)::int from public.friend_names) + (select count(*)::int from public.home_feed('all')),
  0, 'saved entries and friend names are invisible to others, even a linked connection');
select is(public.entry_detail('saved', '00000000-0000-0000-0000-00000000ee01'), null, 'entry_detail returns nothing for someone else''s saved entry');

-- The owner's cards know who a linked friend name is, so tapping "Rahul" opens his profile (§14 B1, C1).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select is((select friend_user_id from public.home_feed('friends') where id = '00000000-0000-0000-0000-00000000ee01'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'feed rows carry the linked account of the friend name');
select is((public.place_page('test:s1') -> 'people_visits' -> 0 ->> 'friend_user_id')::uuid,
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'place page rows carry it too');

select * from finish();
rollback;
