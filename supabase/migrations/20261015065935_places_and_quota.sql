-- M3: places cache and the zero-cost quota guard. Spec §20 (places), §25 (Google Places), §27.5 (lock 1).

create type public.place_category as enum (
  'restaurant', 'cafe', 'bakery', 'dhaba', 'tea_shop', 'fast_food', 'dessert', 'bar', 'street_food', 'delivery_only'
);

-- Written only by Edge Functions (service role). Name/coords/address are cached ≤ 30 days (§25.4).
create table public.places (
  place_id        text primary key,            -- Google Place ID (or "practice:…" in practice mode, §25.6)
  name            text not null,
  lat             double precision not null,
  lng             double precision not null,
  area            text,
  address         text,
  primary_type    text,
  category        public.place_category,
  business_status text,                        -- OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
  refreshed_at    timestamptz not null default now()
);
create index places_lat_lng on public.places (lat, lng);
create index places_name_lower on public.places (lower(name));

alter table public.places enable row level security;
create policy places_select on public.places for select to authenticated using (true);

-- Zero-cost lock 1 (§27.5): global monthly counter per Google SKU, refused at the cap -------------
create table public.usage_caps (
  sku         text primary key,
  monthly_cap int not null check (monthly_cap >= 0)
);
insert into public.usage_caps (sku, monthly_cap) values
  ('autocomplete', 8000),   -- Autocomplete Requests: 10,000 free
  ('details', 4000),        -- Place Details Pro: 5,000 free
  ('details_rich', 800),    -- Place Details Enterprise: 1,000 free
  ('text_search', 4000),    -- Text Search Pro: 5,000 free
  ('nearby', 4000);         -- Nearby Search Pro: 5,000 free

create table public.monthly_usage (
  month date not null,      -- first day of the month (UTC)
  sku   text not null references public.usage_caps,
  count int not null default 0,
  primary key (month, sku)
);

create table public.usage_counters (          -- per-user daily limits for Edge Functions
  user_id uuid references public.profiles on delete cascade,
  day     date not null,
  kind    text not null,                       -- 'places' | 'extract'
  count   int not null default 0,
  primary key (user_id, day, kind)
);

alter table public.usage_caps     enable row level security;   -- no policies: service role only
alter table public.monthly_usage  enable row level security;
alter table public.usage_counters enable row level security;

/** Atomically count one Google call for this month; false (and no count) once the cap is reached. */
create or replace function public.consume_google_quota(p_sku text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  m date := date_trunc('month', now() at time zone 'utc')::date;
  cap int;
  n int;
begin
  select monthly_cap into cap from usage_caps where sku = p_sku;
  if cap is null then raise exception 'unknown_sku'; end if;
  insert into monthly_usage (month, sku, count) values (m, p_sku, 0) on conflict do nothing;
  update monthly_usage set count = count + 1
   where month = m and sku = p_sku and count < cap
  returning count into n;
  return n is not null;
end $$;

/** Per-user daily limit (e.g. 300 Places calls). Returns false once the limit is reached. */
create or replace function public.consume_user_quota(p_user uuid, p_kind text, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'Asia/Kolkata')::date;
  n int;
begin
  insert into usage_counters (user_id, day, kind, count) values (p_user, d, p_kind, 0) on conflict do nothing;
  update usage_counters set count = count + 1
   where user_id = p_user and day = d and kind = p_kind and count < p_limit
  returning count into n;
  return n is not null;
end $$;

revoke execute on function public.consume_google_quota(text) from public, anon, authenticated;
revoke execute on function public.consume_user_quota(uuid, text, int) from public, anon, authenticated;

/** 'tap' while rich details are under their cap, else 'off' (§25.5). */
create or replace function public.google_info_mode() returns text
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select count from monthly_usage
                   where month = date_trunc('month', now() at time zone 'utc')::date and sku = 'details_rich'), 0)
         >= (select monthly_cap from usage_caps where sku = 'details_rich')
    then 'off' else 'tap' end;
$$;
revoke execute on function public.google_info_mode() from anon;
