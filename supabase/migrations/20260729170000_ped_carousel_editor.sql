create or replace function public.sync_ped_carousel_members(
  p_group_id uuid,
  p_member_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  requested_count integer;
  requested_distinct_count integer;
  matched_count integer;
begin
  select count(*)
    into current_count
    from public.ped_items
   where content_group_id = p_group_id
     and content_type = 'carousel';

  if current_count < 2 then
    raise exception 'Carosello non trovato';
  end if;

  requested_count := coalesce(cardinality(p_member_ids), 0);
  if requested_count < 2 or requested_count > 20 then
    raise exception 'Un carosello deve contenere da 2 a 20 contenuti';
  end if;

  select count(distinct member_id)
    into requested_distinct_count
    from unnest(p_member_ids) as requested(member_id);

  if requested_distinct_count <> requested_count then
    raise exception 'L ordine del carosello contiene elementi duplicati';
  end if;

  select count(*)
    into matched_count
    from public.ped_items
   where content_group_id = p_group_id
     and content_type = 'carousel'
     and id = any(p_member_ids);

  if matched_count <> requested_count then
    raise exception 'Un contenuto non appartiene al carosello';
  end if;

  delete from public.ped_items
   where content_group_id = p_group_id
     and content_type = 'carousel'
     and not (id = any(p_member_ids));

  update public.ped_items as item
     set group_position = (requested.position - 1)::integer,
         updated_at = now()
    from unnest(p_member_ids) with ordinality as requested(member_id, position)
   where item.id = requested.member_id
     and item.content_group_id = p_group_id
     and item.content_type = 'carousel';
end;
$$;

revoke all on function public.sync_ped_carousel_members(uuid, uuid[]) from public;
grant execute on function public.sync_ped_carousel_members(uuid, uuid[]) to service_role;
