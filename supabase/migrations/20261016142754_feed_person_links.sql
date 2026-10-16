-- Tapping a person on an entry card opens their profile (spec §14 B1, C1). Friend entries carry the friend name's
-- linked account (`friend_user_id`, owner-only data: saved entries are only ever returned to their owner), so
-- "Rahul told you about" opens Rahul's profile when the owner linked that name. Bodies otherwise unchanged from M7.

drop function if exists public.home_feed(text, timestamptz, uuid, int);
create function public.home_feed(p_filter text default 'all', p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)
returns table (
  entry_type text, id uuid, created_at timestamptz, author_id uuid, author_name text, author_avatar text, is_mine boolean,
  place_id text, place_name text, place_area text, place_category public.place_category,
  rating public.rating, loved text[], disliked text[], price_per_person int, visited_on date, companions text[], is_private boolean,
  friend_name text, source_url text, friend_user_id uuid
)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'visit'::text, v.id, v.created_at, v.author, pr.display_name, pr.avatar_url, v.author = auth.uid(),
           v.place_id, pl.name, pl.area, pl.category,
           v.rating, v.loved, v.disliked, v.price_per_person, v.visited_on, public.visit_companions(v.id, v.author),
           (v.author = auth.uid() and exists (select 1 from visit_audience va join audience_lists l on l.id = va.list_id where va.visit_id = v.id and l.kind = 'only_me')),
           null::text, null::text, null::uuid
    from visits v
    join profiles pr on pr.id = v.author
    join places pl on pl.place_id = v.place_id
    where p_filter in ('all', 'mine', 'connections')
      and public.can_see_visit_social(v.id, auth.uid())
      and case p_filter when 'mine' then v.author = auth.uid() when 'connections' then v.author <> auth.uid() else true end
      and (p_before is null or (v.created_at, v.id) < (p_before, p_before_id))
    union all
    select s.kind::text, s.id, s.created_at, s.owner, null, null, true,
           s.place_id, pl.name, pl.area, pl.category,
           s.rating, s.loved, s.disliked, s.price_per_person, s.visited_on, '{}'::text[], true,
           f.name, s.source_url, f.linked_user
    from saved_entries s
    join places pl on pl.place_id = s.place_id
    left join friend_names f on f.id = s.friend_name_id
    where s.owner = auth.uid()
      and case p_filter when 'all' then true when 'friends' then s.kind = 'friend' when 'internet' then s.kind = 'internet' else false end
      and (p_before is null or (s.created_at, s.id) < (p_before, p_before_id))
  ) t
  order by 3 desc, 2 desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.place_page(p_place_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'on_wishlist', exists (select 1 from wishlist_items where owner = auth.uid() and place_id = p_place_id),
    'my_visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'visited_on', v.visited_on, 'rating', v.rating) order by v.visited_on desc, v.created_at desc)
                           from visits v where v.place_id = p_place_id and v.author = auth.uid()), '[]'::jsonb),
    'people_visits', coalesce((select jsonb_agg(x.j order by x.created_at desc) from (
        select v.created_at, jsonb_build_object(
                 'entry_type', 'visit', 'id', v.id, 'author_id', v.author, 'author_name', pr.display_name, 'author_avatar', pr.avatar_url,
                 'rating', v.rating, 'loved', v.loved, 'disliked', v.disliked, 'price_per_person', v.price_per_person,
                 'visited_on', v.visited_on, 'companions', public.visit_companions(v.id, v.author)) as j
        from visits v join profiles pr on pr.id = v.author
        where v.place_id = p_place_id and v.author <> auth.uid() and public.can_see_visit_social(v.id, auth.uid())
        union all
        select s.created_at, jsonb_build_object(
                 'entry_type', s.kind, 'id', s.id, 'friend_name', f.name, 'friend_user_id', f.linked_user, 'source_url', s.source_url,
                 'rating', s.rating, 'loved', s.loved, 'disliked', s.disliked, 'price_per_person', s.price_per_person,
                 'visited_on', s.visited_on, 'companions', '[]'::jsonb)
        from saved_entries s left join friend_names f on f.id = s.friend_name_id
        where s.place_id = p_place_id and s.owner = auth.uid()
      ) x), '[]'::jsonb)
  );
$$;
