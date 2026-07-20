alter table public.staff_access_logs
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists active_seconds integer not null default 0,
  add column if not exists ended_at timestamptz,
  add column if not exists last_module text;

alter table public.staff_access_logs
  drop constraint if exists staff_access_logs_active_seconds_nonnegative;

alter table public.staff_access_logs
  add constraint staff_access_logs_active_seconds_nonnegative
  check (active_seconds >= 0);

create index if not exists staff_access_logs_profile_activity_idx
on public.staff_access_logs (profile_id, last_activity_at desc);

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

create index if not exists staff_activity_daily_profile_date_idx
on public.staff_activity_daily (profile_id, activity_date desc);

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

create index if not exists staff_action_logs_profile_time_idx
on public.staff_action_logs (profile_id, created_at desc);

create index if not exists staff_action_logs_session_time_idx
on public.staff_action_logs (session_id, created_at desc);

alter table public.staff_activity_daily enable row level security;
alter table public.staff_action_logs enable row level security;

grant select, insert, update on public.staff_access_logs to service_role;
grant select, insert, update on public.staff_activity_daily to service_role;
grant select, insert on public.staff_action_logs to service_role;

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
  select last_activity_at
    into v_previous
  from public.staff_access_logs
  where user_id = p_user_id and session_id = p_session_id
  for update;

  if not found then
    insert into public.staff_access_logs (
      user_id, profile_id, session_id, accessed_at, last_activity_at, last_module
    ) values (
      p_user_id, p_profile_id, p_session_id, v_now, v_now, nullif(p_module_key, '')
    );
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
    user_id, profile_id, activity_date, first_access_at, last_activity_at,
    active_seconds, session_count
  ) values (
    p_user_id, p_profile_id, v_date, v_now, v_now,
    v_elapsed, case when v_new_session then 1 else 0 end
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

insert into public.staff_activity_daily (
  user_id, profile_id, activity_date, first_access_at, last_activity_at,
  active_seconds, session_count
)
select
  user_id,
  profile_id,
  (accessed_at at time zone 'Europe/Rome')::date,
  min(accessed_at),
  max(coalesce(last_activity_at, accessed_at)),
  sum(coalesce(active_seconds, 0))::integer,
  count(*)::integer
from public.staff_access_logs
group by user_id, profile_id, (accessed_at at time zone 'Europe/Rome')::date
on conflict (profile_id, activity_date) do nothing;
