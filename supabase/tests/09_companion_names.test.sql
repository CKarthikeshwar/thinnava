-- F5 companion names (spec §14, §22.4): rename, duplicate check, delete removes from visits, owner only.
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP's schema on the path, so the tests also run on the hosted project, where the CLI's
-- temporary login role is a member of postgres but doesn't use its rights by default.
set local role postgres;
set search_path to public, extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a9', 'a9@t.local'), ('00000000-0000-0000-0000-0000000000b9', 'b9@t.local');
insert into public.places (place_id, name, lat, lng) values ('test:k1', 'Vidyarthi Bhavan', 12.94, 77.57);
create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b9'); select public.create_profile('bala9', 'Bala');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a9'); select public.create_profile('anu9', 'Anu');
select public.save_visit(jsonb_build_object('id','00000000-0000-0000-0000-00000000a901','place_id','test:k1','visited_on',current_date,'rating','good',
  'new_companion_names', jsonb_build_array('Mom', 'Appa')));

select is((select array_agg(name || ':' || visits order by name) from public.my_companion_names()), array['Appa:1','Mom:1'], 'names with visit counts');
select lives_ok($$ select public.rename_companion_name((select id from public.companion_names where name = 'Mom'), '  Amma ') $$, 'rename');
select is((select companions from public.home_feed('mine') where id = '00000000-0000-0000-0000-00000000a901'), array['Amma','Appa'], 'the new name shows on the visit');
select throws_ok($$ select public.rename_companion_name((select id from public.companion_names where name = 'Amma'), 'appa') $$, 'P0001', 'name_taken', 'no duplicate names');
select public.delete_companion_name((select id from public.companion_names where name = 'Appa'));
select is((select companions from public.home_feed('mine') where id = '00000000-0000-0000-0000-00000000a901'), array['Amma'], 'delete removes it from visits');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b9');
select throws_ok($$ select public.delete_companion_name((select id from public.companion_names limit 1)) $$, 'P0001', 'not_found', 'someone else cannot delete my names');
select is((select count(*)::int from public.my_companion_names()), 0, 'and cannot list them');

select * from finish();
rollback;
