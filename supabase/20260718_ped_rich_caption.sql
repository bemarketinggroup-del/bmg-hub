alter table public.ped_items
  add column if not exists caption_html text;

comment on column public.ped_items.caption_html is
  'Copy PED formattato con un sottoinsieme HTML sanificato; caption resta la versione testuale.';
