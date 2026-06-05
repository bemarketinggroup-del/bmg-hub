create extension if not exists "pgcrypto";

create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  service text,
  message text,
  status text not null default 'nuovo'
    check (status in ('nuovo', 'contattato', 'preventivo', 'cliente', 'perso')),
  source text not null default 'bmg_website',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'onboarding',
  services text[] not null default '{}',
  clickup_url text,
  drive_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'staff'
    check (role in ('admin', 'staff')),
  clickup_user_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clickup_tasks (
  id uuid primary key default gen_random_uuid(),
  clickup_task_id text not null unique,
  name text not null,
  description text,
  status text,
  priority text,
  due_date_ms bigint,
  assignees jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  client_tag text,
  client_id uuid references public.clients(id) on delete set null,
  client_tag_status text not null default 'missing'
    check (client_tag_status in ('ok', 'missing', 'unknown')),
  sync_status text not null default 'ok'
    check (sync_status in ('ok', 'warning', 'error')),
  sync_error text,
  clickup_url text,
  list_name text,
  folder_name text,
  space_name text,
  payload jsonb not null default '{}'::jsonb,
  last_clickup_at timestamptz,
  last_hub_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clickup_task_sync_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  clickup_task_id text,
  event_type text,
  source text not null default 'clickup',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create table if not exists public.clickup_task_sync_logs (
  id uuid primary key default gen_random_uuid(),
  clickup_task_id text,
  source text not null,
  action text not null,
  status text not null
    check (status in ('success', 'warning', 'error')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.client_aliases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (client_id, normalized_alias)
);

create table if not exists public.ai_task_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  clickup_task_id text,
  client_id uuid references public.clients(id) on delete set null,
  status text not null check (status in ('success', 'suggestion', 'unresolved', 'error')),
  confidence numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, action, window_start)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_site_leads_updated_at on public.site_leads;
create trigger touch_site_leads_updated_at
before update on public.site_leads
for each row execute function public.touch_updated_at();

drop trigger if exists touch_site_content_updated_at on public.site_content;
create trigger touch_site_content_updated_at
before update on public.site_content
for each row execute function public.touch_updated_at();

drop trigger if exists touch_clients_updated_at on public.clients;
create trigger touch_clients_updated_at
before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists touch_staff_profiles_updated_at on public.staff_profiles;
create trigger touch_staff_profiles_updated_at
before update on public.staff_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_clickup_tasks_updated_at on public.clickup_tasks;
create trigger touch_clickup_tasks_updated_at
before update on public.clickup_tasks
for each row execute function public.touch_updated_at();

drop trigger if exists touch_ai_rate_limits_updated_at on public.ai_rate_limits;
create trigger touch_ai_rate_limits_updated_at
before update on public.ai_rate_limits
for each row execute function public.touch_updated_at();

create index if not exists clickup_tasks_client_tag_status_idx
on public.clickup_tasks (client_tag_status);

create index if not exists clickup_tasks_updated_at_idx
on public.clickup_tasks (updated_at desc);

create index if not exists clickup_task_sync_logs_created_at_idx
on public.clickup_task_sync_logs (created_at desc);

create index if not exists client_aliases_client_id_idx on public.client_aliases (client_id);
create index if not exists client_aliases_normalized_idx on public.client_aliases (normalized_alias);
create index if not exists ai_task_audit_logs_created_at_idx on public.ai_task_audit_logs (created_at desc);
create index if not exists ai_task_audit_logs_task_idx on public.ai_task_audit_logs (clickup_task_id);

alter table public.site_leads enable row level security;
alter table public.site_content enable row level security;
alter table public.clients enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.clickup_tasks enable row level security;
alter table public.clickup_task_sync_events enable row level security;
alter table public.clickup_task_sync_logs enable row level security;
alter table public.client_aliases enable row level security;
alter table public.ai_task_audit_logs enable row level security;
alter table public.ai_rate_limits enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.staff_profiles to service_role;
grant select, insert, update, delete on public.clickup_tasks to service_role;
grant select, insert, update, delete on public.clickup_task_sync_events to service_role;
grant select, insert, update, delete on public.clickup_task_sync_logs to service_role;
grant select, insert, update, delete on public.client_aliases to service_role;
grant select, insert, update, delete on public.ai_task_audit_logs to service_role;
grant select, insert, update, delete on public.ai_rate_limits to service_role;

-- Public site can read only published content when using the anon key.
drop policy if exists "Published content is public" on public.site_content;
create policy "Published content is public"
on public.site_content
for select
using (status = 'published');

-- Internal writes should use the service role key from serverless API only.
