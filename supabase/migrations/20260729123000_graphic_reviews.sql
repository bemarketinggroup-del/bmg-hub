alter table public.staff_profiles
alter column module_permissions set default '{
  "tasks": true,
  "ped": true,
  "clients": true,
  "calendar": true,
  "chat": true,
  "graphics": false,
  "site_backend": false,
  "users": false,
  "smart_working": true,
  "settings": false
}'::jsonb;

update public.staff_profiles
set module_permissions = coalesce(module_permissions, '{}'::jsonb) || '{"graphics": false}'::jsonb
where not (coalesce(module_permissions, '{}'::jsonb) ? 'graphics');

create table if not exists public.graphic_review_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  requested_by_profile_id uuid not null references public.staff_profiles(id) on delete restrict,
  assigned_to_profile_id uuid references public.staff_profiles(id) on delete set null,
  source_surface text not null default 'drive'
    check (source_surface in ('drive', 'ped')),
  source_library text,
  source_root_id text not null,
  source_folder_id text not null,
  source_folder_name text,
  files jsonb not null default '[]'::jsonb
    check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) between 1 and 20),
  instructions text not null
    check (char_length(instructions) between 1 and 4000),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'changes_requested')),
  designer_notes text
    check (designer_notes is null or char_length(designer_notes) <= 4000),
  deliverables jsonb not null default '[]'::jsonb
    check (jsonb_typeof(deliverables) = 'array' and jsonb_array_length(deliverables) <= 40),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graphic_review_requests_status_created_idx
  on public.graphic_review_requests(status, created_at desc);
create index if not exists graphic_review_requests_client_idx
  on public.graphic_review_requests(client_id, created_at desc);
create index if not exists graphic_review_requests_assignee_idx
  on public.graphic_review_requests(assigned_to_profile_id, status);

drop trigger if exists graphic_review_requests_touch_updated_at on public.graphic_review_requests;
create trigger graphic_review_requests_touch_updated_at
before update on public.graphic_review_requests
for each row execute function public.touch_updated_at();

alter table public.staff_notifications
drop constraint if exists staff_notifications_source_type_check;

alter table public.staff_notifications
add constraint staff_notifications_source_type_check
check (source_type in ('task', 'event', 'chat', 'graphic_review'));

alter table public.graphic_review_requests enable row level security;
revoke all on public.graphic_review_requests from anon, authenticated;
grant all on public.graphic_review_requests to service_role;
