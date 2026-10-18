-- M8: pins for the map (spec §14 B2, §22.5, §26.7). One row per place in the visible box, built only from what I may
-- see: my visits, my wishlist, connections' visible visits (can_see_visit_social, so a pending tag never leaks a pin),
-- and my own friend / internet entries.
--
-- Layers: visited · wishlist · connections · friends · internet (empty or null = all).
-- p_person = a connection: their map instead of mine. Their visible visits count as 'visited' and their wishlist (if
-- shared with me) as 'wishlist'; nothing of mine is mixed in.
-- p_price: 'u200' (under ₹200) · '200' (₹200–500) · '500' (₹501–1000) · '1000' (over ₹1000), the same buckets as
-- Search (PRICE_BUCKETS in the app). A place matches if ANY entry I can see there (in scope)
-- has a price in the bucket; places with no price are hidden while it's on (§14 B2a).
-- Rows: (place_id, name, area, category, lat, lng, layers, people (≤ 3 connections who went, newest first), is_mine),
-- at most 300, most recent activity first.

create index if not exists places_lat_lng_idx on public.places (lat, lng);
create index if not exists visits_place_idx on public.visits (place_id);

create or replace function public.map_places(
  p_min_lat double precision, p_min_lng double precision, p_max_lat double precision, p_max_lng double precision,
  p_layers text[] default null, p_price text default null, p_categories public.place_category[] default null,
  p_person uuid default null)
returns table (place_id text, name text, area text, category public.place_category, lat double precision, lng double precision,
               layers text[], people jsonb, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  scope as (select coalesce(p_person, (select uid from me)) as who, p_person is null or p_person = (select uid from me) as mine_view),
  box as (
    select pl.place_id, pl.name, pl.area, pl.category, pl.lat, pl.lng from places pl
    where pl.lat between p_min_lat and p_max_lat and pl.lng between p_min_lng and p_max_lng
      and (p_categories is null or cardinality(p_categories) = 0 or pl.category = any(p_categories))
  ),
  entries as (
    -- my visits
    select v.place_id, 'visited'::text as layer, v.created_at, v.price_per_person as price, null::uuid as person
    from visits v join box b on b.place_id = v.place_id
    where (select mine_view from scope) and v.author = (select uid from me)
    union all
    -- connections' visible visits (my map) or that connection's visible visits (their map)
    select v.place_id, case when (select mine_view from scope) then 'connections' else 'visited' end, v.created_at, v.price_per_person, v.author
    from visits v join box b on b.place_id = v.place_id
    where v.author <> (select uid from me)
      and ((select mine_view from scope) or v.author = p_person)
      and public.can_see_visit_social(v.id, (select uid from me))
    union all
    -- my wishlist, or theirs if they share it with me
    select w.place_id, 'wishlist', w.created_at, null::int, null::uuid
    from wishlist_items w join box b on b.place_id = w.place_id
    where w.owner = (select who from scope) and public.can_see_wishlist(w.owner)
    union all
    -- my friend / internet entries (never on someone else's map)
    select s.place_id, case s.kind when 'friend' then 'friends' else 'internet' end, s.created_at, s.price_per_person, null::uuid
    from saved_entries s join box b on b.place_id = s.place_id
    where (select mine_view from scope) and s.owner = (select uid from me)
  ),
  shown as (
    select e.place_id, array_agg(distinct e.layer) as layers, max(e.created_at) as last_at
    from entries e
    where p_layers is null or cardinality(p_layers) = 0 or e.layer = any(p_layers)
    group by e.place_id
  ),
  priced as (
    select e.place_id from entries e
    where p_price is null
       or (p_price = 'u200' and e.price < 200)
       or (p_price = '200'  and e.price between 200 and 500)
       or (p_price = '500'  and e.price between 501 and 1000)
       or (p_price = '1000' and e.price > 1000)
    group by e.place_id
  )
  select b.place_id, b.name, b.area, b.category, b.lat, b.lng, s.layers,
         coalesce((select jsonb_agg(jsonb_build_object('id', x.person, 'name', pr.display_name, 'avatar', pr.avatar_url) order by x.at desc)
                   from (select e.person, max(e.created_at) as at from entries e
                         where e.place_id = b.place_id and e.person is not null group by e.person
                         order by max(e.created_at) desc limit 3) x
                   join profiles pr on pr.id = x.person), '[]'::jsonb),
         exists (select 1 from visits v where v.place_id = b.place_id and v.author = (select uid from me))
  from shown s
  join box b on b.place_id = s.place_id
  join priced p on p.place_id = s.place_id
  order by s.last_at desc
  limit 300;
$$;
