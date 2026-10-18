-- LOCAL SANDBOX ONLY: ~200 practice places around Bengaluru for testing the map (M8 "Done when": journey C with
-- ~200 pins). Never run against thinnava-prod. Re-runnable: it first deletes everything it made (ids 'practice:seed-…').
--   docker exec -i supabase_db_thinnava psql -U postgres -v ON_ERROR_STOP=1 < tools/sandbox-seed/map_seed.sql
-- Accounts used (sandbox only): me = c_karthikeshwar, A = tester (connected to me), C = cfriend (connected to me).
begin;
select setseed(0.42);

-- Clean up a previous run.
delete from public.saved_entries where place_id like 'practice:seed-%';
delete from public.wishlist_items where place_id like 'practice:seed-%';
delete from public.visits where place_id like 'practice:seed-%';
delete from public.places where place_id like 'practice:seed-%';

create temp table seed_people as
  select (select id from public.profiles where username = 'c_karthikeshwar') as me,
         (select id from public.profiles where username = 'tester') as a,
         (select id from public.profiles where username = 'cfriend') as c;
do $$ begin
  if (select me is null or a is null or c is null from seed_people) then raise exception 'sandbox accounts missing'; end if;
end $$;

-- 200 places spread over the city, with plausible names.
insert into public.places (place_id, name, lat, lng, area, address, category)
select 'practice:seed-' || lpad(n::text, 3, '0'),
       (array['Sri Krishna','Hotel Annapoorna','Brew & Bun','Udupi Grand','Thindi Mane','Nandhini','Darshini Express','Café Mosaic','The Dosa Room','Biryani Point','Roti Ghar','Chai Point','Kulfi Corner','Bun Maska Co','Momo Junction','Hatti Kaapi','Malgudi Mess','Spice Route','Green Leaf','Coastal Curry'])[1 + (n % 20)]
         || ' ' || (array['Jayanagar','Indiranagar','Koramangala','Malleshwaram','HSR','Whitefield','BTM','Basavanagudi','Rajajinagar','Hebbal'])[1 + (n / 20) % 10],
       12.86 + random() * 0.22, 77.50 + random() * 0.22,
       (array['Jayanagar','Indiranagar','Koramangala','Malleshwaram','HSR Layout','Whitefield','BTM Layout','Basavanagudi','Rajajinagar','Hebbal'])[1 + (n / 20) % 10],
       'Practice address, Bengaluru',
       (array['restaurant','cafe','bakery','dhaba','tea_shop','fast_food','dessert','bar','street_food','restaurant']::public.place_category[])[1 + (n % 10)]
from generate_series(1, 200) n;

-- A (tester): 100 visits shared with All connections.
-- C (cfriend): 40 visits shared with All connections.
-- Me: 20 visits of my own.
create temp table seed_visits as
select gen_random_uuid() as id, who, 'practice:seed-' || lpad(n::text, 3, '0') as place_id,
       current_date - (random() * 120)::int as visited_on,
       (array['good','good','okayish','bad']::public.rating[])[1 + (random() * 3)::int] as rating,
       (array[80,150,180,250,320,450,600,850,1200,1800])[1 + (random() * 9)::int] as price,
       now() - (random() * interval '90 days') as created_at
from (select (select a from seed_people) as who, n from generate_series(1, 100) n
      union all select (select c from seed_people), n from generate_series(81, 120) n
      union all select (select me from seed_people), n from generate_series(121, 140) n) x;
insert into public.visits (id, author, place_id, visited_on, rating, loved, disliked, price_per_person, created_at)
select id, who, place_id, visited_on, rating,
       array[(array['Masala dosa','Filter coffee','Chicken biryani','Bun maska','Paneer tikka','Ghee roast','Momos','Kulfi','Idli vada','Fish curry'])[1 + (random() * 9)::int]],
       case when random() < 0.3 then array['Long wait'] else '{}' end,
       price, created_at
from seed_visits;
insert into public.visit_audience (visit_id, list_id)
select v.id, l.id from seed_visits v join public.audience_lists l on l.owner = v.who and l.kind = 'all';

-- My wishlist: 25 unvisited places.
insert into public.wishlist_items (owner, place_id, created_at)
select (select me from seed_people), 'practice:seed-' || lpad(n::text, 3, '0'), now() - (random() * interval '60 days')
from generate_series(141, 165) n;

-- My friend tips (15) and internet finds (10), using the friend name "Rahul" (created if missing).
insert into public.friend_names (id, owner, name)
select gen_random_uuid(), (select me from seed_people), 'Rahul'
where not exists (select 1 from public.friend_names where owner = (select me from seed_people) and lower(name) = 'rahul');
insert into public.saved_entries (id, owner, kind, place_id, friend_name_id, source_url, rating, loved, price_per_person, created_at)
select gen_random_uuid(), (select me from seed_people), 'friend', 'practice:seed-' || lpad(n::text, 3, '0'),
       (select id from public.friend_names where owner = (select me from seed_people) and lower(name) = 'rahul' limit 1), null,
       'good', array['Thali'], 300, now() - (random() * interval '60 days')
from generate_series(166, 180) n;
insert into public.saved_entries (id, owner, kind, place_id, source_url, loved, created_at)
select gen_random_uuid(), (select me from seed_people), 'internet', 'practice:seed-' || lpad(n::text, 3, '0'),
       'https://www.instagram.com/reel/practice' || n, array['Filter coffee'], now() - (random() * interval '60 days')
from generate_series(181, 190) n;

select (select count(*) from public.places where place_id like 'practice:seed-%') as places,
       (select count(*) from public.visits where place_id like 'practice:seed-%') as visits;
commit;
