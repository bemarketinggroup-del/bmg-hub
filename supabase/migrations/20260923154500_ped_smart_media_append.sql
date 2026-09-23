create or replace function public.append_ped_item_media(
  p_identifier uuid,
  p_items jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  base_item public.ped_items%rowtype;
  target_group_id uuid;
  existing_count integer;
  new_count integer;
begin
  select item.*
    into base_item
    from public.ped_items as item
   where item.id = p_identifier
      or item.content_group_id = p_identifier
   order by case when item.id = p_identifier then 0 else 1 end,
            item.group_position asc
   limit 1;

  if base_item.id is null then
    raise exception 'Contenuto PED non trovato';
  end if;

  if base_item.content_type = 'story' then
    raise exception 'Non puoi trasformare una storia in carosello';
  end if;

  if base_item.content_group_id is not null and base_item.content_type <> 'carousel' then
    raise exception 'Gruppo PED non valido';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Elenco contenuti non valido';
  end if;

  new_count := jsonb_array_length(p_items);
  if new_count < 1 then
    raise exception 'Seleziona almeno un nuovo contenuto';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_items) as entry(value)
     where nullif(btrim(entry.value->>'drive_file_id'), '') is null
  ) then
    raise exception 'Un contenuto Drive non e valido';
  end if;

  if (
    select count(distinct entry.value->>'drive_file_id')
      from jsonb_array_elements(p_items) as entry(value)
  ) <> new_count then
    raise exception 'I nuovi contenuti contengono duplicati';
  end if;

  target_group_id := coalesce(base_item.content_group_id, gen_random_uuid());

  select count(*)
    into existing_count
    from public.ped_items as item
   where (base_item.content_group_id is not null and item.content_group_id = base_item.content_group_id)
      or (base_item.content_group_id is null and item.id = base_item.id);

  if existing_count + new_count > 20 then
    raise exception 'Il carosello puo contenere al massimo 20 contenuti';
  end if;

  if exists (
    select 1
      from public.ped_items as item
      join jsonb_array_elements(p_items) as entry(value)
        on item.drive_file_id = entry.value->>'drive_file_id'
     where (base_item.content_group_id is not null and item.content_group_id = base_item.content_group_id)
        or (base_item.content_group_id is null and item.id = base_item.id)
  ) then
    raise exception 'Uno dei contenuti e gia presente nel carosello';
  end if;

  update public.ped_items as item
     set content_type = 'carousel',
         content_group_id = target_group_id,
         cover_frame_seconds = null,
         updated_at = now()
   where (base_item.content_group_id is not null and item.content_group_id = base_item.content_group_id)
      or (base_item.content_group_id is null and item.id = base_item.id);

  insert into public.ped_items (
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
    instagram_position,
    publishing_status,
    created_by
  )
  select
    base_item.client_id,
    base_item.scheduled_date,
    entry.value->>'drive_file_id',
    coalesce(nullif(entry.value->>'drive_file_name', ''), 'Contenuto Drive'),
    nullif(entry.value->>'drive_mime_type', ''),
    nullif(entry.value->>'drive_web_url', ''),
    coalesce((entry.value->>'drive_has_thumbnail')::boolean, false),
    'carousel',
    base_item.caption,
    base_item.caption_html,
    target_group_id,
    existing_count + entry.position::integer - 1,
    base_item.position,
    base_item.instagram_position,
    base_item.publishing_status,
    coalesce(p_created_by, base_item.created_by)
  from jsonb_array_elements(p_items) with ordinality as entry(value, position);

  return target_group_id;
end;
$$;

create or replace function public.append_ped_staging_item_media(
  p_identifier uuid,
  p_items jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  base_item public.ped_staging_items%rowtype;
  target_group_id uuid;
  existing_count integer;
  new_count integer;
begin
  select item.*
    into base_item
    from public.ped_staging_items as item
   where item.id = p_identifier
      or item.content_group_id = p_identifier
   order by case when item.id = p_identifier then 0 else 1 end,
            item.group_position asc
   limit 1;

  if base_item.id is null then
    raise exception 'Contenuto in attesa non trovato';
  end if;

  if base_item.content_type = 'story' then
    raise exception 'Non puoi trasformare una storia in carosello';
  end if;

  if base_item.content_group_id is not null and base_item.content_type <> 'carousel' then
    raise exception 'Gruppo PED non valido';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Elenco contenuti non valido';
  end if;

  new_count := jsonb_array_length(p_items);
  if new_count < 1 then
    raise exception 'Seleziona almeno un nuovo contenuto';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_items) as entry(value)
     where nullif(btrim(entry.value->>'drive_file_id'), '') is null
  ) then
    raise exception 'Un contenuto Drive non e valido';
  end if;

  if (
    select count(distinct entry.value->>'drive_file_id')
      from jsonb_array_elements(p_items) as entry(value)
  ) <> new_count then
    raise exception 'I nuovi contenuti contengono duplicati';
  end if;

  target_group_id := coalesce(base_item.content_group_id, gen_random_uuid());

  select count(*)
    into existing_count
    from public.ped_staging_items as item
   where (base_item.content_group_id is not null and item.content_group_id = base_item.content_group_id)
      or (base_item.content_group_id is null and item.id = base_item.id);

  if existing_count + new_count > 20 then
    raise exception 'Il carosello puo contenere al massimo 20 contenuti';
  end if;

  if exists (
    select 1
      from public.ped_staging_items as item
      join jsonb_array_elements(p_items) as entry(value)
        on item.drive_file_id = entry.value->>'drive_file_id'
     where (base_item.content_group_id is not null and item.content_group_id = base_item.content_group_id)
        or (base_item.content_group_id is null and item.id = base_item.id)
  ) then
    raise exception 'Uno dei contenuti e gia presente nel carosello';
  end if;

  update public.ped_staging_items as item
     set content_type = 'carousel',
         content_group_id = target_group_id,
         cover_frame_seconds = null,
         updated_at = now()
   where (base_item.content_group_id is not null and item.content_group_id = base_item.content_group_id)
      or (base_item.content_group_id is null and item.id = base_item.id);

  insert into public.ped_staging_items (
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
    created_by
  )
  select
    base_item.client_id,
    entry.value->>'drive_file_id',
    coalesce(nullif(entry.value->>'drive_file_name', ''), 'Contenuto Drive'),
    nullif(entry.value->>'drive_mime_type', ''),
    nullif(entry.value->>'drive_web_url', ''),
    coalesce((entry.value->>'drive_has_thumbnail')::boolean, false),
    'carousel',
    base_item.caption,
    base_item.caption_html,
    target_group_id,
    existing_count + entry.position::integer - 1,
    base_item.position,
    base_item.publishing_status,
    coalesce(p_created_by, base_item.created_by)
  from jsonb_array_elements(p_items) with ordinality as entry(value, position);

  return target_group_id;
end;
$$;

revoke all on function public.append_ped_item_media(uuid, jsonb, uuid) from public;
grant execute on function public.append_ped_item_media(uuid, jsonb, uuid) to service_role;

revoke all on function public.append_ped_staging_item_media(uuid, jsonb, uuid) from public;
grant execute on function public.append_ped_staging_item_media(uuid, jsonb, uuid) to service_role;

comment on function public.append_ped_item_media(uuid, jsonb, uuid) is
  'Aggiunge media a un contenuto PED e converte atomicamente post o reel in carosello.';

comment on function public.append_ped_staging_item_media(uuid, jsonb, uuid) is
  'Aggiunge media a un contenuto PED in attesa e lo converte atomicamente in carosello.';
