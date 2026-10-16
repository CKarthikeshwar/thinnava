-- Companion tags and notifications (spec §7, §12, §21.3 "the A–B–C tag scenario", "a pending tag is visible only to
-- the tagger and the tagged user").
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a4', 'a4@t.local'),  -- A (Ananya)
  ('00000000-0000-0000-0000-0000000000b4', 'b4@t.local'),  -- B (Bharat), connected to A and C
  ('00000000-0000-0000-0000-0000000000c4', 'c4@t.local'),  -- C (Chitra), connected only to B
  ('00000000-0000-0000-0000-0000000000d4', 'd4@t.local');  -- D (Dev), connected to A
insert into public.places (place_id, name, lat, lng) values ('test:t1', 'Bao Story', 12.97, 77.64), ('test:t2', 'Toit', 12.98, 77.64);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4'); select public.create_profile('ananya4', 'Ananya R');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4'); select public.create_profile('bharat4', 'Bharat K');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4'); select public.create_profile('chitra4', 'Chitra');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4'); select public.create_profile('dev4', 'Dev');

-- Requests notify; accepting notifies back (§12).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.send_request('00000000-0000-0000-0000-0000000000b4');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select is((select type::text from public.notifications_page() limit 1), 'connect_request', 'a request notifies the receiver');
select is(public.unread_notifications(), 1, 'it counts as unread');
select public.respond_request('00000000-0000-0000-0000-0000000000a4', true);
select is((select count(*)::int from public.notifications_page() where type = 'connect_request'), 0, 'answering removes the request notification');
select public.mark_notifications_read();
select is(public.unread_notifications(), 0, 'mark read clears the dot');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select is((select type::text from public.notifications_page() limit 1), 'connect_accepted', 'the sender hears it was accepted');
reset role;
insert into public.connections (user_a, user_b) values
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000c4'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000d4');
set local role authenticated;

-- Only connections can be tagged.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select throws_ok($$ select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000ab01','place_id','test:t1','visited_on',current_date,'rating','good',
  'tag_user_ids', jsonb_build_array('00000000-0000-0000-0000-0000000000c4'))) $$, 'P0001', 'not_connected', 'non-connections cannot be tagged');

-- A visits Bao Story with B, shared with A's Only me — the tag still lets B see that one visit.
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000ab01','place_id','test:t1','visited_on',current_date,'rating','good',
  'loved', jsonb_build_array('Chicken bao'), 'price_per_person', 450, 'notes', 'Go early',
  'audience', jsonb_build_array((select id from public.audience_lists where owner = auth.uid() and kind = 'only_me')),
  'tag_user_ids', jsonb_build_array('00000000-0000-0000-0000-0000000000b4')));
select is((select companions from public.home_feed('mine') limit 1), array['Bharat · pending'], 'the tagger sees "with Bharat · pending"');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select is((select type::text from public.notifications_page() limit 1), 'tag_request', 'the tagged person gets a tag request');
select is((select count(*)::int from public.visits where id = '00000000-0000-0000-0000-00000000ab01'), 1, 'a pending tag lets B see that one visit (§5.2 c)');
select is((select count(*)::int from public.home_feed('all')), 0, '…but it does not enter B''s feed');
select is((public.tag_detail((select id from public.tags limit 1)) ->> 'tagger_name'), 'Ananya R', 'E8 shows who tagged me');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select is((select count(*)::int from public.tags), 0, 'a pending tag is invisible to others (D)');
select is((select count(*)::int from public.visits where id = '00000000-0000-0000-0000-00000000ab01'), 0, 'D cannot see A''s Only-me visit');

-- B: "Same as A's" (§7.3).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select isnt(public.respond_tag((select id from public.tags limit 1), 'same'), null, 'Same as A''s creates B''s own visit');
select is((select loved from public.visits where author = auth.uid()), array['Chicken bao'], 'B''s visit copies A''s dishes');
select is((select notes from public.visits where author = auth.uid()), 'Go early', '…and notes');
select is(public.audience_names(array(select list_id from public.visit_audience va join public.visits v on v.id = va.visit_id where v.author = auth.uid())),
  array['All connections'], 'B''s copy is shared with B''s All connections');
select is((select companions from public.home_feed('mine') limit 1), array['Ananya'], 'B''s visit reads "with Ananya"');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select is((select companions from public.home_feed('mine') limit 1), array['Bharat'], 'A''s visit now reads "with Bharat" (accepted)');

-- C (connected only to B): sees B's visit "with Ananya", nothing of A's (§7 example).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select is((select count(*)::int from public.home_feed('connections')), 1, 'C sees B''s visit');
select is((select companions from public.home_feed('connections') limit 1), array['Ananya'], '…with Ananya''s name');
select is((select count(*)::int from public.visits where author = '00000000-0000-0000-0000-0000000000a4'), 0, '…and none of A''s content');
select is((public.profile_page('00000000-0000-0000-0000-0000000000a4') ->> 'relation'), 'none', 'tapping Ananya shows Request to connect');

-- Un-tag (§7.6): the link goes from both visits; B's own visit stays.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select public.untag_me((select id from public.tags limit 1));
select is((select count(*)::int from public.visits where author = auth.uid()), 1, 'after un-tagging, B''s own visit stays');
select is((select companions from public.home_feed('mine') limit 1), '{}'::text[], '…without "with Ananya"');

-- Activity notifications (§12): opt-in, only when visible, wishlist variant wins.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select public.set_activity_notifications('00000000-0000-0000-0000-0000000000a4', true);
select public.set_wishlist('test:t2', true);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000ab02','place_id','test:t2','visited_on',current_date,'rating','okayish'));
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000ab03','place_id','test:t1','visited_on',current_date,'rating','bad',
  'audience', jsonb_build_array((select id from public.audience_lists where owner = auth.uid() and kind = 'only_me'))));
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select is((select array_agg(type::text) from public.notifications_page()), array['wishlist_visited'],
  'D hears about A''s visit to a place on D''s wishlist, and nothing about the Only-me visit');

-- Block clears pending tags and notifications between the two.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000ab04','place_id','test:t2','visited_on',current_date,'rating','good',
  'tag_user_ids', jsonb_build_array('00000000-0000-0000-0000-0000000000d4')));
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select public.block_user('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.tags) + (select count(*)::int from public.notifications_page()), 0, 'blocking removes pending tags and notifications both ways');

select * from finish();
rollback;
