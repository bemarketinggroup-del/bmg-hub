alter table public.staff_profiles
  add column if not exists email_aliases jsonb not null default '[]'::jsonb;

alter table public.staff_profiles
  drop constraint if exists staff_profiles_email_aliases_array;

alter table public.staff_profiles
  add constraint staff_profiles_email_aliases_array
  check (jsonb_typeof(email_aliases) = 'array');
