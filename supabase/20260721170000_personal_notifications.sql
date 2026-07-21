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
