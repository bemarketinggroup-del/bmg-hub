alter table if exists public.staff_action_logs
add column if not exists context_label text;

comment on column public.staff_action_logs.context_label is
'Contesto leggibile dell’azione, ad esempio cliente, PED, mese, data e contenuto coinvolto.';
