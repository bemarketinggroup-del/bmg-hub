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

create index if not exists clickup_tasks_client_tag_status_idx
on public.clickup_tasks (client_tag_status);

create index if not exists clickup_tasks_updated_at_idx
on public.clickup_tasks (updated_at desc);

create index if not exists clickup_task_sync_logs_created_at_idx
on public.clickup_task_sync_logs (created_at desc);

drop trigger if exists touch_clickup_tasks_updated_at on public.clickup_tasks;
create trigger touch_clickup_tasks_updated_at
before update on public.clickup_tasks
for each row execute function public.touch_updated_at();

alter table public.clickup_tasks enable row level security;
alter table public.clickup_task_sync_events enable row level security;
alter table public.clickup_task_sync_logs enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.clickup_tasks to service_role;
grant select, insert, update, delete on public.clickup_task_sync_events to service_role;
grant select, insert, update, delete on public.clickup_task_sync_logs to service_role;
