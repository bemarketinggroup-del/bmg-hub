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

create index if not exists client_aliases_client_id_idx on public.client_aliases (client_id);
create index if not exists client_aliases_normalized_idx on public.client_aliases (normalized_alias);
create index if not exists ai_task_audit_logs_created_at_idx on public.ai_task_audit_logs (created_at desc);
create index if not exists ai_task_audit_logs_task_idx on public.ai_task_audit_logs (clickup_task_id);

drop trigger if exists touch_ai_rate_limits_updated_at on public.ai_rate_limits;
create trigger touch_ai_rate_limits_updated_at
before update on public.ai_rate_limits
for each row execute function public.touch_updated_at();

alter table public.client_aliases enable row level security;
alter table public.ai_task_audit_logs enable row level security;
alter table public.ai_rate_limits enable row level security;

grant select, insert, update, delete on public.client_aliases to service_role;
grant select, insert, update, delete on public.ai_task_audit_logs to service_role;
grant select, insert, update, delete on public.ai_rate_limits to service_role;
