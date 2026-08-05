alter table public.ped_share_links
  add column if not exists token_ciphertext text,
  add column if not exists share_month text;

alter table public.ped_share_links
  drop constraint if exists ped_share_links_share_month_check;

alter table public.ped_share_links
  add constraint ped_share_links_share_month_check
  check (share_month is null or share_month ~ '^\d{4}-\d{2}$');

comment on column public.ped_share_links.token_ciphertext is
  'Bearer token cifrato AES-256-GCM dal backend, recuperabile soltanto dallo staff autenticato con accesso PED.';

comment on column public.ped_share_links.share_month is
  'Mese iniziale incluso nell ultimo URL PED condiviso generato.';
