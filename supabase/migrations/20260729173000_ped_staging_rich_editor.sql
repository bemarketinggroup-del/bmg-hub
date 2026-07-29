alter table public.ped_staging_items
  add column if not exists caption_html text;
