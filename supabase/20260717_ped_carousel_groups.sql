alter table public.ped_items
  add column if not exists content_group_id uuid,
  add column if not exists group_position integer not null default 0;

alter table public.ped_items
  drop constraint if exists ped_items_group_position_check;

alter table public.ped_items
  add constraint ped_items_group_position_check check (group_position >= 0);

create index if not exists ped_items_content_group_idx
  on public.ped_items (content_group_id, group_position)
  where content_group_id is not null;

update public.ped_items
set caption = null,
    updated_at = now()
where content_type = 'story'
  and caption is not null;

comment on column public.ped_items.content_group_id is
  'Identificatore condiviso dai file che compongono un unico carosello PED.';

comment on column public.ped_items.group_position is
  'Ordine del file all interno del carosello.';
