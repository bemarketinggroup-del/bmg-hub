create table if not exists public.smart_work_employees (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid references public.staff_profiles(id) on delete set null,
  full_name text not null,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (full_name),
  unique (email)
);

insert into public.smart_work_employees (staff_profile_id, full_name, email, is_active)
select id, coalesce(nullif(full_name, ''), email), email, false
from public.staff_profiles
where active = true
on conflict (full_name) do update set
  staff_profile_id = excluded.staff_profile_id,
  email = excluded.email,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.smart_work_employees (full_name, is_active)
values
  ('Andry', true),
  ('Marta', true),
  ('Marzia', true),
  ('Sabrina', true),
  ('Federica', true),
  ('Francesco', true),
  ('Daniele', true)
on conflict (full_name) do update set
  is_active = true,
  updated_at = now();

update public.smart_work_employees
set is_active = false,
    updated_at = now()
where staff_profile_id is not null
  and full_name not in ('Andry','Marta','Marzia','Sabrina','Federica','Francesco','Daniele');

alter table public.calendar_event_attendees
  drop constraint if exists calendar_event_attendees_employee_id_fkey;

alter table public.employee_unavailability
  drop constraint if exists employee_unavailability_employee_id_fkey;

alter table public.smart_work_assignments
  drop constraint if exists smart_work_assignments_employee_id_fkey;

update public.calendar_event_attendees attendee
set employee_id = employee.id
from public.smart_work_employees employee
where employee.staff_profile_id = attendee.employee_id;

update public.employee_unavailability unavailable
set employee_id = employee.id
from public.smart_work_employees employee
where employee.staff_profile_id = unavailable.employee_id;

update public.smart_work_assignments assignment
set employee_id = employee.id
from public.smart_work_employees employee
where employee.staff_profile_id = assignment.employee_id;

alter table public.calendar_event_attendees
  add constraint calendar_event_attendees_employee_id_fkey
  foreign key (employee_id) references public.smart_work_employees(id) on delete set null;

alter table public.employee_unavailability
  add constraint employee_unavailability_employee_id_fkey
  foreign key (employee_id) references public.smart_work_employees(id) on delete cascade;

alter table public.smart_work_assignments
  add constraint smart_work_assignments_employee_id_fkey
  foreign key (employee_id) references public.smart_work_employees(id) on delete cascade;

create index if not exists smart_work_employees_active_idx
  on public.smart_work_employees (is_active, full_name);

alter table public.smart_work_employees enable row level security;

grant select, insert, update, delete on public.smart_work_employees to service_role;
