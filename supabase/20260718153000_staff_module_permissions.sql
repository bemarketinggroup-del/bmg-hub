alter table public.staff_profiles
add column if not exists module_permissions jsonb not null default '{
  "tasks": true,
  "ped": true,
  "clients": true,
  "site_backend": false,
  "users": false,
  "smart_working": true,
  "settings": false
}'::jsonb;

alter table public.staff_profiles
drop constraint if exists staff_profiles_module_permissions_object;

alter table public.staff_profiles
add constraint staff_profiles_module_permissions_object
check (jsonb_typeof(module_permissions) = 'object');

update public.staff_profiles
set module_permissions = '{
  "tasks": true,
  "ped": true,
  "clients": true,
  "site_backend": true,
  "users": true,
  "smart_working": true,
  "settings": true
}'::jsonb
where role = 'admin';
