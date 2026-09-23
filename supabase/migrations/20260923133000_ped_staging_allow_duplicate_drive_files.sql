alter table public.ped_staging_items
  drop constraint if exists ped_staging_items_client_id_drive_file_id_key;

create index if not exists ped_staging_items_client_drive_file_idx
  on public.ped_staging_items(client_id, drive_file_id);

comment on table public.ped_staging_items is
  'Contenuti Drive temporanei in attesa: lo stesso file puo essere aggiunto piu volte con un avviso non bloccante.';
