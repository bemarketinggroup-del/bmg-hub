create table if not exists public.ped_share_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.staff_profiles(id) on delete set null,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ped_share_links_one_active_per_client_idx
on public.ped_share_links (client_id)
where is_active;

create index if not exists ped_share_links_client_created_idx
on public.ped_share_links (client_id, created_at desc);

alter table public.ped_share_links enable row level security;

grant select, insert, update, delete on public.ped_share_links to service_role;

comment on table public.ped_share_links is
  'Link revocabili per mostrare al cliente esclusivamente il proprio calendario PED in sola lettura.';

comment on column public.ped_share_links.token_hash is
  'Hash SHA-256 del bearer token. Il token originale non viene salvato nel database.';
