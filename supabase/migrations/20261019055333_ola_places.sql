-- Places provider: Ola Maps instead of Google (spec §25, §27.5, changelog 2026-10-19). Google billing couldn't be set up.
-- Ola gives 100,000 free calls per API per month and only charges prepaid credits (we add none). These caps stop each
-- API well below the free amount, so a busy month pauses search instead of ever needing credits.
insert into public.usage_caps (sku, monthly_cap) values
  ('ola_autocomplete', 90000),
  ('ola_text_search', 90000),
  ('ola_details', 90000)
on conflict (sku) do update set monthly_cap = excluded.monthly_cap;

-- "More info" on a place page now uses Ola's details call too (same counter name, larger cap).
update public.usage_caps set monthly_cap = 20000 where sku = 'details_rich';
