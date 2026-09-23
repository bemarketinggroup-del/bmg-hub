alter table public.ped_staging_items
  add column if not exists cover_frame_seconds numeric(10, 3);

alter table public.ped_staging_items
  drop constraint if exists ped_staging_items_cover_frame_seconds_check;

alter table public.ped_staging_items
  add constraint ped_staging_items_cover_frame_seconds_check
  check (cover_frame_seconds is null or (cover_frame_seconds >= 0 and cover_frame_seconds <= 86400));

create or replace function public.move_ped_item_to_staging(
  p_identifier uuid,
  p_caption text,
  p_caption_html text,
  p_publishing_status text,
  p_apply_edits boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_identifier uuid;
  target_group_id uuid;
begin
  select coalesce(item.content_group_id, item.id), item.content_group_id
    into target_identifier, target_group_id
    from public.ped_items as item
   where item.id = p_identifier
      or item.content_group_id = p_identifier
   order by case when item.id = p_identifier then 0 else 1 end,
            item.group_position asc
   limit 1;

  if target_identifier is null then
    raise exception 'Contenuto PED non trovato';
  end if;

  insert into public.ped_staging_items (
    id,
    client_id,
    drive_file_id,
    drive_file_name,
    drive_mime_type,
    drive_web_url,
    drive_has_thumbnail,
    content_type,
    caption,
    caption_html,
    content_group_id,
    group_position,
    position,
    publishing_status,
    cover_frame_seconds,
    created_by,
    created_at,
    updated_at
  )
  select
    item.id,
    item.client_id,
    item.drive_file_id,
    item.drive_file_name,
    item.drive_mime_type,
    item.drive_web_url,
    item.drive_has_thumbnail,
    item.content_type,
    case when p_apply_edits and item.content_type <> 'story' then p_caption else item.caption end,
    case when p_apply_edits and item.content_type <> 'story' then p_caption_html else item.caption_html end,
    item.content_group_id,
    item.group_position,
    item.position,
    case when p_apply_edits then p_publishing_status else item.publishing_status end,
    item.cover_frame_seconds,
    item.created_by,
    item.created_at,
    now()
  from public.ped_items as item
  where (target_group_id is not null and item.content_group_id = target_group_id)
     or (target_group_id is null and item.id = target_identifier);

  delete from public.ped_items as item
   where (target_group_id is not null and item.content_group_id = target_group_id)
      or (target_group_id is null and item.id = target_identifier);

  return target_identifier;
end;
$$;

create or replace function public.move_ped_staging_to_date(
  p_identifier uuid,
  p_scheduled_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_identifier uuid;
  target_group_id uuid;
begin
  if p_scheduled_date is null then
    raise exception 'Data PED non valida';
  end if;

  select coalesce(item.content_group_id, item.id), item.content_group_id
    into target_identifier, target_group_id
    from public.ped_staging_items as item
   where item.id = p_identifier
      or item.content_group_id = p_identifier
   order by case when item.id = p_identifier then 0 else 1 end,
            item.group_position asc
   limit 1;

  if target_identifier is null then
    raise exception 'Contenuto in attesa non trovato';
  end if;

  insert into public.ped_items (
    id,
    client_id,
    scheduled_date,
    drive_file_id,
    drive_file_name,
    drive_mime_type,
    drive_web_url,
    drive_has_thumbnail,
    content_type,
    caption,
    caption_html,
    content_group_id,
    group_position,
    position,
    publishing_status,
    cover_frame_seconds,
    created_by,
    created_at,
    updated_at
  )
  select
    item.id,
    item.client_id,
    p_scheduled_date,
    item.drive_file_id,
    item.drive_file_name,
    item.drive_mime_type,
    item.drive_web_url,
    item.drive_has_thumbnail,
    item.content_type,
    item.caption,
    item.caption_html,
    item.content_group_id,
    item.group_position,
    item.position,
    item.publishing_status,
    item.cover_frame_seconds,
    item.created_by,
    item.created_at,
    now()
  from public.ped_staging_items as item
  where (target_group_id is not null and item.content_group_id = target_group_id)
     or (target_group_id is null and item.id = target_identifier);

  delete from public.ped_staging_items as item
   where (target_group_id is not null and item.content_group_id = target_group_id)
      or (target_group_id is null and item.id = target_identifier);

  return target_identifier;
end;
$$;

revoke all on function public.move_ped_item_to_staging(uuid, text, text, text, boolean) from public;
grant execute on function public.move_ped_item_to_staging(uuid, text, text, text, boolean) to service_role;

revoke all on function public.move_ped_staging_to_date(uuid, date) from public;
grant execute on function public.move_ped_staging_to_date(uuid, date) to service_role;

comment on function public.move_ped_item_to_staging(uuid, text, text, text, boolean) is
  'Sposta atomicamente un contenuto PED, incluso un carosello, nell area in attesa.';

comment on function public.move_ped_staging_to_date(uuid, date) is
  'Programma atomicamente un contenuto in attesa su una data del PED.';
