-- Offline sync (spec §13): a tag for someone who is no longer a connection is dropped silently instead of failing the
-- whole visit. save_visit is otherwise unchanged from 20261016085839_tags_and_notifications.sql.

create or replace function public.save_visit(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_id uuid := (p ->> 'id')::uuid;
  v_place text := p ->> 'place_id';
  v_date date := (p ->> 'visited_on')::date;
  v_price int := nullif(p ->> 'price_per_person', '')::int;
  v_notes text := nullif(trim(coalesce(p ->> 'notes', '')), '');
  v_accept uuid := nullif(p ->> 'accept_tag_id', '')::uuid;
  existing uuid;
  is_new boolean;
  aud uuid[];
  cid uuid;
  nm text;
  tag_ids uuid[];
  tid uuid;
  new_tag uuid;
  removed boolean := false;
  sub record;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if v_id is null then raise exception 'bad_id'; end if;
  if not exists (select 1 from places where place_id = v_place) then raise exception 'unknown_place'; end if;
  if v_date is null or v_date > (now() at time zone 'Asia/Kolkata')::date then raise exception 'bad_date'; end if;
  if (p ->> 'rating') is null then raise exception 'rating_required'; end if;
  if v_price is not null and (v_price < 1 or v_price > 50000) then raise exception 'bad_price'; end if;
  if v_notes is not null and char_length(v_notes) > 500 then raise exception 'notes_too_long'; end if;

  select author into existing from visits where id = v_id;
  if existing is not null and existing <> me then raise exception 'not_owner'; end if;
  is_new := existing is null;

  insert into visits (id, author, place_id, visited_on, rating, loved, disliked, price_per_person, notes)
  values (v_id, me, v_place, v_date, (p ->> 'rating')::rating, clean_dishes(p -> 'loved'), clean_dishes(p -> 'disliked'), v_price, v_notes)
  on conflict (id) do update set
    place_id = excluded.place_id, visited_on = excluded.visited_on, rating = excluded.rating,
    loved = excluded.loved, disliked = excluded.disliked, price_per_person = excluded.price_per_person, notes = excluded.notes;

  aud := resolve_audience(me, p -> 'audience');
  delete from visit_audience where visit_id = v_id;
  insert into visit_audience (visit_id, list_id) select v_id, unnest(aud);

  delete from visit_companion_names where visit_id = v_id;
  for cid in select x::uuid from jsonb_array_elements_text(coalesce(p -> 'companion_name_ids', '[]'::jsonb)) x loop
    if exists (select 1 from companion_names where id = cid and owner = me) then
      insert into visit_companion_names values (v_id, cid) on conflict do nothing;
    end if;
  end loop;
  for nm in select trim(x) from jsonb_array_elements_text(coalesce(p -> 'new_companion_names', '[]'::jsonb)) x loop
    if nm = '' then continue; end if;
    if char_length(nm) > 40 then raise exception 'name_too_long'; end if;
    insert into companion_names (owner, name) values (me, nm) on conflict (owner, lower(name)) do nothing;
    select id into cid from companion_names where owner = me and lower(name) = lower(nm);
    insert into visit_companion_names values (v_id, cid) on conflict do nothing;
  end loop;

  -- Tags: only when the key is present (so older clients and offline replays don't wipe tags).
  if p ? 'tag_user_ids' then
    -- Only current connections can be tagged. Anyone else is dropped silently and the visit still saves (§13: a visit
    -- queued offline may sync after a connection ended).
    select coalesce(array_agg(distinct x::uuid), '{}') into tag_ids from jsonb_array_elements_text(p -> 'tag_user_ids') x
      where x::uuid <> me and public.is_connected(me, x::uuid);
    delete from tags where visit_id = v_id and tagger = me and tagged <> all (tag_ids);
    foreach tid in array tag_ids loop
      new_tag := null;
      insert into tags (visit_id, tagger, tagged) values (v_id, me, tid) on conflict (visit_id, tagged) do nothing returning id into new_tag;
      if new_tag is not null then perform public.notify(tid, 'tag_request', me, v_id, new_tag); end if;
    end loop;
  end if;

  if v_accept is not null then
    update tags set status = 'accepted', tagged_visit_id = v_id where id = v_accept and tagged = me and status = 'pending';
    if not found then raise exception 'tag_not_found'; end if;
  end if;

  if is_new then
    delete from wishlist_items where owner = me and place_id = v_place;
    removed := found;
    -- Activity (§12): opted-in subscribers who can see this visit; the wishlist variant wins.
    for sub in select s.subscriber from activity_subscriptions s where s.target = me loop
      if public.can_see_visit_social(v_id, sub.subscriber) then
        perform public.notify(sub.subscriber,
          case when exists (select 1 from wishlist_items w where w.owner = sub.subscriber and w.place_id = v_place)
               then 'wishlist_visited'::notif_type else 'connection_visited'::notif_type end, me, v_id);
      end if;
    end loop;
  end if;
  return jsonb_build_object('id', v_id, 'removed_from_wishlist', removed);
end $$;
