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

drop trigger if exists touch_staff_profiles_updated_at on public.staff_profiles;
create trigger touch_staff_profiles_updated_at
before update on public.staff_profiles
for each row execute function public.touch_updated_at();

alter table public.staff_profiles enable row level security;

-- Internal access is performed by serverless APIs with the service role key.
-- No anon/authenticated direct policies are enabled in V1.
