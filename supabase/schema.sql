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
  module_permissions jsonb not null default '{"tasks":true,"ped":true,"clients":true,"site_backend":false,"users":false,"smart_working":true,"settings":false}'::jsonb
    check (jsonb_typeof(module_permissions) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  session_id text not null,
  accessed_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  ended_at timestamptz,
  last_module text,
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists staff_access_logs_profile_time_idx
on public.staff_access_logs (profile_id, accessed_at desc);

create table if not exists public.staff_activity_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  activity_date date not null,
  first_access_at timestamptz not null,
  last_activity_at timestamptz not null,
  active_seconds integer not null default 0 check (active_seconds >= 0),
  session_count integer not null default 1 check (session_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, activity_date)
);

create table if not exists public.staff_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  session_id text not null,
  action_key text not null,
  action_label text not null,
  module_key text,
  endpoint text,
  method text,
  entity_type text,
  entity_id text,
  created_at timestamptz not null default now()
);

create index if not exists staff_access_logs_profile_activity_idx
on public.staff_access_logs (profile_id, last_activity_at desc);

create index if not exists staff_activity_daily_profile_date_idx
on public.staff_activity_daily (profile_id, activity_date desc);

create index if not exists staff_action_logs_profile_time_idx
on public.staff_action_logs (profile_id, created_at desc);

create or replace function public.record_staff_activity(
  p_user_id uuid,
  p_profile_id uuid,
  p_session_id text,
  p_event_type text default 'heartbeat',
  p_module_key text default null
)
returns table(recorded boolean, elapsed_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_date date := (v_now at time zone 'Europe/Rome')::date;
  v_previous timestamptz;
  v_elapsed integer := 0;
  v_new_session boolean := false;
begin
  select last_activity_at into v_previous
  from public.staff_access_logs
  where user_id = p_user_id and session_id = p_session_id
  for update;

  if not found then
    insert into public.staff_access_logs (user_id, profile_id, session_id, accessed_at, last_activity_at, last_module)
    values (p_user_id, p_profile_id, p_session_id, v_now, v_now, nullif(p_module_key, ''));
    v_new_session := true;
  else
    if p_event_type in ('heartbeat', 'session_end', 'action') then
      v_elapsed := least(45, greatest(0, floor(extract(epoch from (v_now - v_previous)))::integer));
    end if;
    update public.staff_access_logs
    set last_activity_at = v_now,
        active_seconds = active_seconds + v_elapsed,
        ended_at = case
          when p_event_type = 'session_end' then v_now
          when p_event_type = 'resume' then null
          else ended_at
        end,
        last_module = coalesce(nullif(p_module_key, ''), last_module)
    where user_id = p_user_id and session_id = p_session_id;
  end if;

  insert into public.staff_activity_daily (
    user_id, profile_id, activity_date, first_access_at, last_activity_at, active_seconds, session_count
  ) values (
    p_user_id, p_profile_id, v_date, v_now, v_now, v_elapsed, case when v_new_session then 1 else 0 end
  )
  on conflict (profile_id, activity_date) do update
  set first_access_at = least(public.staff_activity_daily.first_access_at, excluded.first_access_at),
      last_activity_at = greatest(public.staff_activity_daily.last_activity_at, excluded.last_activity_at),
      active_seconds = public.staff_activity_daily.active_seconds + excluded.active_seconds,
      session_count = public.staff_activity_daily.session_count + excluded.session_count,
      updated_at = v_now;

  return query select v_new_session, v_elapsed;
end;
$$;

revoke all on function public.record_staff_activity(uuid, uuid, text, text, text) from public;
grant execute on function public.record_staff_activity(uuid, uuid, text, text, text) to service_role;

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
alter table public.staff_access_logs enable row level security;
alter table public.staff_activity_daily enable row level security;
alter table public.staff_action_logs enable row level security;
alter table public.clickup_tasks enable row level security;
alter table public.clickup_task_sync_events enable row level security;
alter table public.clickup_task_sync_logs enable row level security;
alter table public.client_aliases enable row level security;
alter table public.ai_task_audit_logs enable row level security;
alter table public.ai_rate_limits enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.staff_profiles to service_role;
grant select, insert, update on public.staff_access_logs to service_role;
grant select, insert, update on public.staff_activity_daily to service_role;
grant select, insert on public.staff_action_logs to service_role;
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

-- Smart Working / Google Calendar MVP
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

create table if not exists public.smart_work_employees (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid references public.staff_profiles(id) on delete set null,
  full_name text not null,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (full_name),
  unique (email)
);

create table if not exists public.calendar_event_attendees (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events_cache(id) on delete cascade,
  employee_id uuid references public.smart_work_employees(id) on delete set null,
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
  employee_id uuid not null references public.smart_work_employees(id) on delete cascade,
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
  employee_id uuid not null references public.smart_work_employees(id) on delete cascade,
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

insert into public.smart_work_employees (staff_profile_id, full_name, email, is_active)
select id, coalesce(nullif(full_name, ''), email), email, false
from public.staff_profiles
where active = true
on conflict (full_name) do update set
  staff_profile_id = excluded.staff_profile_id,
  email = excluded.email,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.smart_work_employees (full_name, email, is_active)
values
  ('Andry', 'andriyph@gmail.com', true),
  ('Marta', null, true),
  ('Marzia', null, true),
  ('Sabrina', null, true),
  ('Federica', 'federicamatacena01@gmail.com', true),
  ('Francesco', null, true),
  ('Daniele', null, true),
  ('Davide De Luca', 'davidedelucarec@gmail.com', true),
  ('Simone Prezioso', 'simone.foto@live.it', true)
on conflict (full_name) do update set
  email = coalesce(excluded.email, public.smart_work_employees.email),
  is_active = true,
  updated_at = now();

update public.smart_work_employees
set is_active = false,
    updated_at = now()
where staff_profile_id is not null
  and full_name not in ('Andry','Marta','Marzia','Sabrina','Federica','Francesco','Daniele','Davide De Luca','Simone Prezioso');

create index if not exists calendar_events_cache_week_idx on public.calendar_events_cache (calendar_id, start_at, end_at);
create index if not exists smart_work_employees_active_idx on public.smart_work_employees (is_active, full_name);
create index if not exists calendar_event_attendees_employee_idx on public.calendar_event_attendees (employee_id);
create index if not exists employee_unavailability_employee_date_idx on public.employee_unavailability (employee_id, date);
create index if not exists smart_work_plans_week_idx on public.smart_work_plans (week_start_date, status);
create index if not exists smart_work_assignments_plan_date_idx on public.smart_work_assignments (plan_id, date);

alter table public.google_calendar_connections enable row level security;
alter table public.calendar_events_cache enable row level security;
alter table public.smart_work_employees enable row level security;
alter table public.calendar_event_attendees enable row level security;
alter table public.smart_work_rules enable row level security;
alter table public.employee_unavailability enable row level security;
alter table public.smart_work_plans enable row level security;
alter table public.smart_work_assignments enable row level security;

grant select, insert, update, delete on public.google_calendar_connections to service_role;
grant select, insert, update, delete on public.calendar_events_cache to service_role;
grant select, insert, update, delete on public.smart_work_employees to service_role;
grant select, insert, update, delete on public.calendar_event_attendees to service_role;
grant select, insert, update, delete on public.smart_work_rules to service_role;
grant select, insert, update, delete on public.employee_unavailability to service_role;
grant select, insert, update, delete on public.smart_work_plans to service_role;
grant select, insert, update, delete on public.smart_work_assignments to service_role;

create table if not exists public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  source_type text not null check (source_type in ('task', 'event')),
  source_id text not null,
  title text not null,
  message text,
  link text,
  occurred_at timestamptz not null default now(),
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, source_type, source_id)
);

create index if not exists staff_notifications_profile_idx
  on public.staff_notifications(profile_id, occurred_at desc);
create index if not exists staff_notifications_unread_idx
  on public.staff_notifications(profile_id, dismissed_at)
  where dismissed_at is null;

drop trigger if exists staff_notifications_touch_updated_at on public.staff_notifications;
create trigger staff_notifications_touch_updated_at
before update on public.staff_notifications
for each row execute function public.touch_updated_at();

alter table public.staff_notifications enable row level security;
revoke all on public.staff_notifications from anon, authenticated;
grant all on public.staff_notifications to service_role;
