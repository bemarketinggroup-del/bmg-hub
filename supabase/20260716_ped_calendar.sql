create table if not exists public.ped_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_date date not null,
  drive_file_id text not null,
  drive_file_name text not null,
  drive_mime_type text,
  drive_web_url text,
  drive_has_thumbnail boolean not null default false,
  caption text,
  position integer not null default 0,
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, scheduled_date, drive_file_id)
);

create index if not exists ped_items_client_date_idx
on public.ped_items (client_id, scheduled_date, position, created_at);

alter table public.ped_items enable row level security;

grant select, insert, update, delete on public.ped_items to service_role;

comment on table public.ped_items is
  'Piano editoriale: collegamenti datati ai contenuti originali nelle cartelle Google Drive dei clienti.';
