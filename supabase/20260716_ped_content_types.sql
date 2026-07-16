alter table public.ped_items
add column if not exists content_type text not null default 'post';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ped_items_content_type_check'
      and conrelid = 'public.ped_items'::regclass
  ) then
    alter table public.ped_items
    add constraint ped_items_content_type_check
    check (content_type in ('post', 'story', 'reel', 'carousel'));
  end if;
end
$$;

create index if not exists ped_items_client_type_date_idx
on public.ped_items (client_id, content_type, scheduled_date);

comment on column public.ped_items.content_type is
  'Formato editoriale: post, story, reel o carousel (multipost).';
