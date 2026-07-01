create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  calendar_id text not null unique,
  calendar_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  google_event_id text not null,
  calendar_id text not null,
  title text,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  event_type text,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (google_event_id, calendar_id)
);

create table if not exists public.calendar_event_attendees (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events_cache(id) on delete cascade,
  employee_id uuid references public.staff_profiles(id) on delete set null,
  attendee_email text not null,
  response_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_work_rules (
  id uuid primary key default gen_random_uuid(),
  max_remote_per_day integer not null default 2 check (max_remote_per_day between 1 and 10),
  remote_days_per_employee integer not null default 1 check (remote_days_per_employee between 1 and 5),
  working_days text[] not null default array['mon','tue','wed','thu','fri'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_unavailability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.staff_profiles(id) on delete cascade,
  date date not null,
  type text not null default 'calendar',
  source text not null default 'google_calendar',
  source_event_id uuid references public.calendar_events_cache(id) on delete cascade,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, date, source_event_id)
);

create table if not exists public.smart_work_plans (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start_date, status)
);

create table if not exists public.smart_work_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.smart_work_plans(id) on delete cascade,
  employee_id uuid not null references public.staff_profiles(id) on delete cascade,
  date date not null,
  status text not null default 'suggested'
    check (status in ('suggested', 'confirmed', 'manual_changed', 'conflict')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, employee_id)
);

insert into public.smart_work_rules (max_remote_per_day, remote_days_per_employee, working_days)
select 2, 1, array['mon','tue','wed','thu','fri']
where not exists (select 1 from public.smart_work_rules);

create index if not exists calendar_events_cache_week_idx on public.calendar_events_cache (calendar_id, start_at, end_at);
create index if not exists calendar_event_attendees_employee_idx on public.calendar_event_attendees (employee_id);
create index if not exists employee_unavailability_employee_date_idx on public.employee_unavailability (employee_id, date);
create index if not exists smart_work_plans_week_idx on public.smart_work_plans (week_start_date, status);
create index if not exists smart_work_assignments_plan_date_idx on public.smart_work_assignments (plan_id, date);

alter table public.google_calendar_connections enable row level security;
alter table public.calendar_events_cache enable row level security;
alter table public.calendar_event_attendees enable row level security;
alter table public.smart_work_rules enable row level security;
alter table public.employee_unavailability enable row level security;
alter table public.smart_work_plans enable row level security;
alter table public.smart_work_assignments enable row level security;

grant select, insert, update, delete on public.google_calendar_connections to service_role;
grant select, insert, update, delete on public.calendar_events_cache to service_role;
grant select, insert, update, delete on public.calendar_event_attendees to service_role;
grant select, insert, update, delete on public.smart_work_rules to service_role;
grant select, insert, update, delete on public.employee_unavailability to service_role;
grant select, insert, update, delete on public.smart_work_plans to service_role;
grant select, insert, update, delete on public.smart_work_assignments to service_role;
