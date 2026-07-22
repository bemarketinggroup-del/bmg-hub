insert into public.smart_work_employees (full_name, email, is_active)
values ('Davide De Luca', 'davidedelucarec@gmail.com', true)
on conflict (full_name) do update set
  email = excluded.email,
  is_active = true,
  updated_at = now();
