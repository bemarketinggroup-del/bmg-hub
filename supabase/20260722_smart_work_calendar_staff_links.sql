insert into public.smart_work_employees (full_name, email, is_active)
values
  ('Andry', 'andriyph@gmail.com', true),
  ('Federica', 'federicamatacena01@gmail.com', true),
  ('Simone Prezioso', 'simone.foto@live.it', true)
on conflict (full_name) do update set
  email = excluded.email,
  is_active = true,
  updated_at = now();
