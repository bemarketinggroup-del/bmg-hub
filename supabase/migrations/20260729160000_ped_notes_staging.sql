create table if not exists public.ped_day_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  note_date date not null,
  note_text text not null default ''
    check (char_length(note_text) <= 180),
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, note_date)
);

create index if not exists ped_day_notes_client_date_idx
  on public.ped_day_notes(client_id, note_date);

drop trigger if exists ped_day_notes_touch_updated_at on public.ped_day_notes;
create trigger ped_day_notes_touch_updated_at
before update on public.ped_day_notes
for each row execute function public.touch_updated_at();

create table if not exists public.ped_staging_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  drive_file_id text not null,
  drive_file_name text not null,
  drive_mime_type text,
  drive_web_url text,
  drive_has_thumbnail boolean not null default false,
  content_type text not null default 'post'
    check (content_type in ('post', 'story', 'reel', 'carousel')),
  caption text,
  content_group_id uuid,
  group_position integer not null default 0 check (group_position >= 0),
  position integer not null default 0,
  publishing_status text not null default 'ped_only'
    check (publishing_status in ('ped_only', 'meta', 'phone')),
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, drive_file_id)
);

create index if not exists ped_staging_items_client_position_idx
  on public.ped_staging_items(client_id, position, created_at);
create index if not exists ped_staging_items_group_idx
  on public.ped_staging_items(content_group_id, group_position)
  where content_group_id is not null;

drop trigger if exists ped_staging_items_touch_updated_at on public.ped_staging_items;
create trigger ped_staging_items_touch_updated_at
before update on public.ped_staging_items
for each row execute function public.touch_updated_at();

alter table public.ped_day_notes enable row level security;
alter table public.ped_staging_items enable row level security;
revoke all on public.ped_day_notes from anon, authenticated;
revoke all on public.ped_staging_items from anon, authenticated;
grant all on public.ped_day_notes to service_role;
grant all on public.ped_staging_items to service_role;

comment on table public.ped_day_notes is
  'Note brevi condivise visualizzate nelle singole caselle giornaliere del PED.';
comment on table public.ped_staging_items is
  'Contenuti Drive temporanei in attesa di essere trascinati su una data del PED.';
