alter table if exists public.staff_action_logs
add column if not exists client_id uuid references public.clients(id) on delete set null;

comment on column public.staff_action_logs.client_id is
'Cliente PED interessato dall azione, usato per personalizzare le analisi operative dello staff.';

create index if not exists staff_action_logs_profile_client_time_idx
on public.staff_action_logs (profile_id, client_id, created_at desc)
where client_id is not null;

update public.staff_action_logs as action
set client_id = client.id
from public.clients as client
where action.client_id is null
  and action.module_key = 'ped'
  and lower(left(coalesce(action.context_label, ''), char_length(client.name) + 3)) = lower(client.name || ' · ');
