create table if not exists public.staff_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  session_id text not null,
  accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists staff_access_logs_profile_time_idx
on public.staff_access_logs (profile_id, accessed_at desc);

alter table public.staff_access_logs enable row level security;

grant select, insert on public.staff_access_logs to service_role;
