alter table public.ped_items
  add column if not exists publishing_status text not null default 'ped_only';

alter table public.ped_items
  drop constraint if exists ped_items_publishing_status_check;

alter table public.ped_items
  add constraint ped_items_publishing_status_check
  check (publishing_status in ('ped_only', 'meta', 'phone'));

comment on column public.ped_items.publishing_status is
  'Stato operativo: solo PED, programmato Meta o programmato da telefono.';
