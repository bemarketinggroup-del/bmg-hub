alter table public.ped_items
  add column if not exists instagram_position integer;

alter table public.ped_items
  drop constraint if exists ped_items_instagram_position_check;

alter table public.ped_items
  add constraint ped_items_instagram_position_check
  check (instagram_position is null or instagram_position >= 0);

create index if not exists ped_items_client_instagram_position_idx
  on public.ped_items (client_id, instagram_position)
  where instagram_position is not null;

comment on column public.ped_items.instagram_position is
  'Ordine manuale della pubblicazione nella griglia profilo Instagram del PED.';
