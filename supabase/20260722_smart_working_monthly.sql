alter table public.smart_work_assignments
  add column if not exists google_event_id text,
  add column if not exists forced boolean not null default false,
  add column if not exists source text not null default 'auto';

alter table public.employee_unavailability
  add column if not exists google_event_id text,
  add column if not exists is_manual boolean not null default false,
  add column if not exists forced boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

delete from public.employee_unavailability older
using public.employee_unavailability newer
where older.source = 'bmg_hub'
  and newer.source = 'bmg_hub'
  and older.employee_id = newer.employee_id
  and older.date = newer.date
  and (
    older.created_at < newer.created_at
    or (older.created_at = newer.created_at and older.id < newer.id)
  );

create unique index if not exists employee_unavailability_bmg_hub_unique
  on public.employee_unavailability (employee_id, date)
  where source = 'bmg_hub';

create index if not exists smart_work_assignments_month_idx
  on public.smart_work_assignments (date, employee_id, source);

create index if not exists employee_unavailability_month_idx
  on public.employee_unavailability (date, employee_id, source);
