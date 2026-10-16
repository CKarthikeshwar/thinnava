-- Wishlist = places I haven't visited (spec §9). Saving a visit already removes the place from my wishlist;
-- now adding a place I've visited is ignored, and a connection's wishlist rows say whether I've been there,
-- so the app can hide ♡ for them.

create or replace function public.set_wishlist(p_place_id text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_on then
    if not exists (select 1 from places where place_id = p_place_id) then raise exception 'unknown_place'; end if;
    if exists (select 1 from visits where author = auth.uid() and place_id = p_place_id) then return; end if;
    insert into wishlist_items (owner, place_id) values (auth.uid(), p_place_id) on conflict do nothing;
  else
    delete from wishlist_items where owner = auth.uid() and place_id = p_place_id;
  end if;
end $$;

drop function if exists public.user_wishlist(uuid);
create function public.user_wishlist(p_user uuid)
returns table (place_id text, name text, area text, category public.place_category, created_at timestamptz, on_mine boolean, i_went boolean)
language sql stable security definer set search_path = public as $$
  select w.place_id, pl.name, pl.area, pl.category, w.created_at,
         exists (select 1 from wishlist_items m where m.owner = auth.uid() and m.place_id = w.place_id),
         exists (select 1 from visits v where v.author = auth.uid() and v.place_id = w.place_id)
  from wishlist_items w join places pl on pl.place_id = w.place_id
  where w.owner = p_user and public.can_see_wishlist(p_user)
  order by w.created_at desc;
$$;
