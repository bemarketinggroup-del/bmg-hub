alter table public.staff_profiles
alter column module_permissions set default '{
  "tasks": true,
  "ped": true,
  "clients": true,
  "calendar": true,
  "chat": true,
  "site_backend": false,
  "users": false,
  "smart_working": true,
  "settings": false
}'::jsonb;

update public.staff_profiles
set module_permissions = coalesce(module_permissions, '{}'::jsonb) || '{"chat": true}'::jsonb
where not (coalesce(module_permissions, '{}'::jsonb) ? 'chat');

create table if not exists public.team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  recipient_profile_id uuid references public.staff_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_profile_id is null or recipient_profile_id <> sender_profile_id)
);

create index if not exists team_chat_messages_created_idx
  on public.team_chat_messages(created_at desc);
create index if not exists team_chat_messages_sender_idx
  on public.team_chat_messages(sender_profile_id, created_at desc);
create index if not exists team_chat_messages_recipient_idx
  on public.team_chat_messages(recipient_profile_id, created_at desc)
  where recipient_profile_id is not null;

drop trigger if exists team_chat_messages_touch_updated_at on public.team_chat_messages;
create trigger team_chat_messages_touch_updated_at
before update on public.team_chat_messages
for each row execute function public.touch_updated_at();

create table if not exists public.team_chat_reads (
  profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  conversation_key text not null,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, conversation_key)
);

alter table public.staff_notifications
drop constraint if exists staff_notifications_source_type_check;

alter table public.staff_notifications
add constraint staff_notifications_source_type_check
check (source_type in ('task', 'event', 'chat'));

alter table public.team_chat_messages enable row level security;
alter table public.team_chat_reads enable row level security;
revoke all on public.team_chat_messages from anon, authenticated;
revoke all on public.team_chat_reads from anon, authenticated;
grant all on public.team_chat_messages to service_role;
grant all on public.team_chat_reads to service_role;
