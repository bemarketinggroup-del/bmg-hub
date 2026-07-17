alter table public.ped_items
  drop constraint if exists ped_items_client_id_scheduled_date_drive_file_id_key;

alter table public.ped_items
  add constraint ped_items_client_id_scheduled_date_drive_file_id_key
  unique (client_id, scheduled_date, drive_file_id)
  deferrable initially immediate;

create or replace function public.sync_ped_publication_order(
  p_client_id uuid,
  p_identifiers uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requested_count integer;
  v_target_count integer;
  v_assignments jsonb;
begin
  v_requested_count := coalesce(cardinality(p_identifiers), 0);
  if p_client_id is null or v_requested_count = 0 or v_requested_count > 200 then
    raise exception 'client_id e un ordine di pubblicazione valido sono richiesti'
      using errcode = '22023';
  end if;

  if (select count(distinct identifier) from unnest(p_identifiers) as requested(identifier)) <> v_requested_count then
    raise exception 'L ordine di pubblicazione contiene elementi duplicati'
      using errcode = '22023';
  end if;

  create temporary table ped_publication_targets (
    identifier uuid primary key,
    desired_order integer not null,
    previous_date date not null,
    current_position integer not null,
    is_feed_content boolean not null
  ) on commit drop;

  insert into ped_publication_targets (
    identifier,
    desired_order,
    previous_date,
    current_position,
    is_feed_content
  )
  select
    coalesce(item.content_group_id, item.id),
    requested.desired_order::integer,
    min(item.scheduled_date),
    min(item.position),
    bool_and(item.content_type <> 'story')
  from unnest(p_identifiers) with ordinality as requested(identifier, desired_order)
  join public.ped_items item
    on item.client_id = p_client_id
   and (item.id = requested.identifier or item.content_group_id = requested.identifier)
  group by coalesce(item.content_group_id, item.id), requested.desired_order;

  select count(*) into v_target_count from ped_publication_targets;
  if v_target_count <> v_requested_count then
    raise exception 'Uno o piu contenuti del profilo non sono stati trovati'
      using errcode = 'P0002';
  end if;

  if exists (select 1 from ped_publication_targets where not is_feed_content) then
    raise exception 'Le stories non possono essere incluse nell ordine del feed'
      using errcode = '22023';
  end if;

  create temporary table ped_publication_assignments (
    identifier uuid primary key,
    desired_order integer not null,
    scheduled_date date not null,
    position integer not null
  ) on commit drop;

  insert into ped_publication_assignments (
    identifier,
    desired_order,
    scheduled_date,
    position
  )
  with available_slots as (
    select
      row_number() over (
        order by previous_date desc, current_position desc, identifier
      )::integer as slot_order,
      previous_date as scheduled_date
    from ped_publication_targets
  ), dated_assignments as (
    select
      target.identifier,
      target.desired_order,
      slot.scheduled_date
    from ped_publication_targets target
    join available_slots slot on slot.slot_order = target.desired_order
  )
  select
    identifier,
    desired_order,
    scheduled_date,
    (
      count(*) over (partition by scheduled_date)
      - row_number() over (partition by scheduled_date order by desired_order)
    )::integer as position
  from dated_assignments;

  set constraints ped_items_client_id_scheduled_date_drive_file_id_key deferred;

  update public.ped_items item
  set
    scheduled_date = assignment.scheduled_date,
    position = assignment.position,
    instagram_position = assignment.desired_order - 1,
    updated_at = now()
  from ped_publication_assignments assignment
  where item.client_id = p_client_id
    and coalesce(item.content_group_id, item.id) = assignment.identifier;

  select jsonb_agg(
    jsonb_build_object(
      'id', identifier,
      'scheduled_date', scheduled_date,
      'position', position,
      'instagram_position', desired_order - 1
    )
    order by desired_order
  )
  into v_assignments
  from ped_publication_assignments;

  return jsonb_build_object(
    'ok', true,
    'count', v_target_count,
    'assignments', coalesce(v_assignments, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.sync_ped_publication_order(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.sync_ped_publication_order(uuid, uuid[]) to service_role;

comment on function public.sync_ped_publication_order(uuid, uuid[]) is
  'Allinea atomicamente l ordine del profilo Instagram agli slot di pubblicazione gia presenti nel calendario PED.';
