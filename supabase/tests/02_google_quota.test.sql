-- Zero-cost lock 1 (spec §27.5): the counter refuses at the cap and app users can't touch it.
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP's schema on the path, so the tests also run on the hosted project, where the CLI's
-- temporary login role is a member of postgres but doesn't use its rights by default.
set local role postgres;
set search_path to public, extensions;
select plan(8);

-- Shrink one cap to 2 for the test (rolled back at the end).
update public.usage_caps set monthly_cap = 2 where sku = 'details_rich';
-- Start this month's count at zero, whatever real use there has been (also rolled back).
delete from public.monthly_usage where sku = 'details_rich';

select is(public.consume_google_quota('details_rich'), true,  'call 1 allowed');
select is(public.google_info_mode(), 'tap', 'mode is tap below the cap');
select is(public.consume_google_quota('details_rich'), true,  'call 2 allowed');
select is(public.consume_google_quota('details_rich'), false, 'call 3 refused at the cap');
select is((select count from public.monthly_usage where sku = 'details_rich' and month = date_trunc('month', now() at time zone 'utc')::date), 2, 'refused call was not counted');
select is(public.google_info_mode(), 'off', 'More info switches off at the cap');
select throws_ok($$ select public.consume_google_quota('nonsense') $$, 'P0001', 'unknown_sku', 'unknown SKU is rejected');

-- Signed-in app users must not be able to call the counter or read the caps.
set local role authenticated;
select throws_ok($$ select public.consume_google_quota('details') $$, '42501', null, 'app users cannot call consume_google_quota');

select * from finish();
rollback;
