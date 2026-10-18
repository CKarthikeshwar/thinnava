-- F5 My companion names (spec §14, §22.4): private names like "Mom" used in "with …" on my visits.
-- Rename keeps them on every visit; delete removes the name from those visits (visit_companion_names cascades).

create or replace function public.my_companion_names() returns table (id uuid, name text, visits int)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, (select count(*)::int from visit_companion_names vc where vc.companion_name_id = c.id)
  from companion_names c where c.owner = auth.uid()
  order by lower(c.name);
$$;

create or replace function public.rename_companion_name(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if nm = '' then raise exception 'name_required'; end if;
  if char_length(nm) > 40 then raise exception 'name_too_long'; end if;
  if exists (select 1 from companion_names where owner = auth.uid() and lower(name) = lower(nm) and id <> p_id) then
    raise exception 'name_taken';
  end if;
  update companion_names set name = nm where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.delete_companion_name(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from companion_names where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;

-- Signed-out callers get nothing (as in earlier migrations), including functions recreated or added on 2026-10-16.
do $$
declare f text;
begin
  foreach f in array array[
    'my_companion_names()', 'rename_companion_name(uuid,text)', 'delete_companion_name(uuid)',
    'home_feed(text,timestamptz,uuid,int)', 'user_wishlist(uuid)',
    'map_places(double precision,double precision,double precision,double precision,text[],text,public.place_category[],uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
