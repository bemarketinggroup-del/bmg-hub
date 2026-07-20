create unique index if not exists staff_profiles_clickup_user_id_unique
  on public.staff_profiles (clickup_user_id)
  where clickup_user_id is not null and btrim(clickup_user_id) <> '';
