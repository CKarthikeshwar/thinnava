-- Connections, blocks and lists (spec §5, §8, §21.3).
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP's schema on the path, so the tests also run on the hosted project, where the CLI's
-- temporary login role is a member of postgres but doesn't use its rights by default.
set local role postgres;
set search_path to public, extensions;
select plan(32);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a3', 'a3@t.local'),  -- Anu
  ('00000000-0000-0000-0000-0000000000b3', 'b3@t.local'),  -- Bharat
  ('00000000-0000-0000-0000-0000000000c3', 'c3@t.local'),  -- Chitra
  ('00000000-0000-0000-0000-0000000000d3', 'd3@t.local');  -- Dev
insert into public.places (place_id, name, lat, lng) values ('test:c1', 'Toit', 12.98, 77.64);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3'); select public.create_profile('anu3', 'Anu');
select public.update_profile('anu3', 'Anu', 'Will travel for dosa');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3'); select public.create_profile('bharat3', 'Bharat');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3'); select public.create_profile('chitra3', 'Chitra');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3'); select public.create_profile('dev3', 'Dev');

-- Requests (§5.1)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select is(public.send_request('00000000-0000-0000-0000-0000000000b3'), 'requested', 'A asks B');
select is((select relation from public.search_people('bhar')), 'requested', 'search shows "requested" to the sender');
select is((public.profile_page('00000000-0000-0000-0000-0000000000b3') ->> 'bio'), null, 'no bio before connecting');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select is((select relation from public.search_people('anu3')), 'incoming', 'B sees an incoming request');
select is((public.profile_page('00000000-0000-0000-0000-0000000000a3') ->> 'bio'), null, 'bio is hidden from non-connections');
select public.respond_request('00000000-0000-0000-0000-0000000000a3', true);
select is(public.is_connected('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b3'), true, 'accepting connects');
select is((public.profile_page('00000000-0000-0000-0000-0000000000a3') ->> 'bio'), 'Will travel for dosa', 'connections see the bio');
select is((select count(*)::int from public.pending_list_prompts()), 1, 'accepting queues the E5 sheet for B');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.pending_list_prompts()), 1, '…and for A');

-- Crossing requests connect immediately (§5.1)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select public.send_request('00000000-0000-0000-0000-0000000000a3');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select is(public.send_request('00000000-0000-0000-0000-0000000000d3'), 'connected', 'asking someone who already asked you connects straight away');

-- Silent decline (§5.1)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select public.send_request('00000000-0000-0000-0000-0000000000a3');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.respond_request('00000000-0000-0000-0000-0000000000c3', false);
select is((select count(*)::int from public.my_requests() where direction = 'incoming'), 0, 'a declined request leaves my inbox');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is(public.relation_to('00000000-0000-0000-0000-0000000000a3'), 'requested', 'the sender still sees "Requested" (decline is silent)');
select is(public.send_request('00000000-0000-0000-0000-0000000000a3'), 'requested', 'asking again does not reach them');

-- Lists: Close friends (§8, §21.3)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.create_list('Close friends');
select throws_ok($$ select public.create_list('close FRIENDS') $$, 'P0001', 'list_name_taken', 'list names are unique per user, any case');
select throws_ok($$ select public.add_to_lists('00000000-0000-0000-0000-0000000000c3', array[(select id from public.audience_lists where name = 'Close friends')]) $$,
  'P0001', 'not_connected', 'only connections can be added to lists');
select public.add_to_lists('00000000-0000-0000-0000-0000000000b3', array[(select id from public.audience_lists where name = 'Close friends')]);
select is((select count(*)::int from public.pending_list_prompts() where id = '00000000-0000-0000-0000-0000000000b3'), 0, 'adding to lists clears the E5 prompt');
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000cc01','place_id','test:c1','visited_on',current_date,'rating','good',
  'audience', jsonb_build_array((select id from public.audience_lists where owner = auth.uid() and name = 'Close friends'))));
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select is((select count(*)::int from public.user_visits('00000000-0000-0000-0000-0000000000a3')), 1, 'B (in Close friends) sees the visit');
select is((select count from public.who_went(array['test:c1'])), 1, 'who_went counts A for B');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select count(*)::int from public.user_visits('00000000-0000-0000-0000-0000000000a3')), 0, 'D (connected, not in the list) does not');
select is((select count(*)::int from public.who_went(array['test:c1'])), 0, 'who_went shows nothing D may not see');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::int from public.user_visits('00000000-0000-0000-0000-0000000000a3')), 0, 'C (not connected) does not');

-- Lists are private: members never learn which lists they are in
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select is((select count(*)::int from public.audience_lists where owner = '00000000-0000-0000-0000-0000000000a3') + (select count(*)::int from public.list_members),
  0, 'members cannot see the lists they are in');

-- Deleting a list falls back to Only me, never wider (§8)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.delete_list((select id from public.audience_lists where name = 'Close friends'));
select is(public.audience_names(array(select list_id from public.visit_audience where visit_id = '00000000-0000-0000-0000-00000000cc01')),
  array['Only me'], 'a visit shared only with a deleted list becomes Only me');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select is((select count(*)::int from public.user_visits('00000000-0000-0000-0000-0000000000a3')), 0, '…so B no longer sees it');

-- Disconnecting hides content (§5.4)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000cc02','place_id','test:c1','visited_on',current_date,'rating','okayish'));
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select is((select count(*)::int from public.user_visits('00000000-0000-0000-0000-0000000000a3')), 1, 'B sees A''s All-connections visit');
select public.remove_connection('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.user_visits('00000000-0000-0000-0000-0000000000a3')) + (select count(*)::int from public.home_feed('connections')),
  0, 'after disconnecting, B sees none of A''s visits');
select is((public.profile_page('00000000-0000-0000-0000-0000000000a3') ->> 'bio'), null, '…nor the bio');

-- Block (§5.3)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.block_user('00000000-0000-0000-0000-0000000000d3');
select is(public.is_connected('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000d3'), false, 'blocking removes the connection');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select count(*)::int from public.search_people('anu')), 0, 'a blocked user cannot find me in search');
select is(public.profile_page('00000000-0000-0000-0000-0000000000a3'), null, '…or open my profile');
select throws_ok($$ select public.send_request('00000000-0000-0000-0000-0000000000a3') $$, 'P0001', 'blocked', '…or send me a request');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.unblock_user('00000000-0000-0000-0000-0000000000d3');
select is(public.is_connected('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000d3'), false, 'unblocking does not restore the connection');

select * from finish();
rollback;
