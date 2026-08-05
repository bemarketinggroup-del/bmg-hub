drop index if exists public.ped_share_links_one_active_per_client_idx;

create unique index if not exists ped_share_links_one_recoverable_active_per_client_idx
on public.ped_share_links (client_id)
where is_active and token_ciphertext is not null;

comment on index public.ped_share_links_one_recoverable_active_per_client_idx is
  'Consente di mantenere attivi i link storici non recuperabili insieme a un solo link cifrato nuovamente copiabile.';
