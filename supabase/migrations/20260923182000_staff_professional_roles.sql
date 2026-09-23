alter table public.staff_profiles
  add column if not exists professional_role text not null default 'unspecified';

alter table public.staff_profiles
  add column if not exists professional_role_label text;

alter table public.staff_profiles
  drop constraint if exists staff_profiles_professional_role_check;

alter table public.staff_profiles
  add constraint staff_profiles_professional_role_check
  check (professional_role in ('unspecified', 'graphic_designer', 'social_media_manager', 'videomaker', 'custom'));

update public.staff_profiles
set professional_role = 'graphic_designer',
    professional_role_label = null
where regexp_replace(lower(coalesce(full_name, '')), '\s+', ' ', 'g') = 'francesco gaglione';
