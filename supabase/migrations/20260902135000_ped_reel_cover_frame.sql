alter table public.ped_items
  add column if not exists cover_frame_seconds numeric(10, 3);

alter table public.ped_items
  drop constraint if exists ped_items_cover_frame_seconds_check;

alter table public.ped_items
  add constraint ped_items_cover_frame_seconds_check
  check (cover_frame_seconds is null or (cover_frame_seconds >= 0 and cover_frame_seconds <= 86400));

comment on column public.ped_items.cover_frame_seconds is
  'Secondo del video scelto come copertina del Reel nella griglia Instagram del PED.';
