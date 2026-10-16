-- M6: "who's been" for Search results (spec §14 B4). Only entries I may see count: my visits, visible connection
-- visits (can_see_visit) and my own saved entries.

/**
 * For a set of places: up to 3 people I know who went (faces), how many, whether I went, and every price I can see
 * there (the app applies the B2a price buckets: a place matches if any visible price is in the bucket).
 */
create or replace function public.who_went(p_place_ids text[])
returns table (place_id text, people jsonb, count int, i_went boolean, prices int[])
language sql stable security definer set search_path = public as $$
  with seen as (
    select v.place_id, v.author, v.price_per_person, v.created_at
    from visits v
    where v.place_id = any (p_place_ids) and public.can_see_visit(v.id)
  ),
  saved as (
    select s.place_id, s.price_per_person from saved_entries s
    where s.owner = auth.uid() and s.place_id = any (p_place_ids)
  ),
  others as (
    select se.place_id, se.author, max(se.created_at) as last
    from seen se where se.author <> auth.uid() group by se.place_id, se.author
  )
  select pid,
         coalesce((select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.display_name, 'avatar', pr.avatar_url) order by o.last desc)
                   from (select * from others o2 where o2.place_id = pid order by o2.last desc limit 3) o join profiles pr on pr.id = o.author), '[]'::jsonb),
         (select count(*)::int from others o where o.place_id = pid),
         exists (select 1 from seen where seen.place_id = pid and seen.author = auth.uid()),
         coalesce(array(select price_per_person from seen where seen.place_id = pid and price_per_person is not null
                        union all select price_per_person from saved where saved.place_id = pid and price_per_person is not null), '{}')
  from unnest(p_place_ids) as pid
  where exists (select 1 from seen where seen.place_id = pid) or exists (select 1 from saved where saved.place_id = pid);
$$;
revoke execute on function public.who_went(text[]) from anon;
