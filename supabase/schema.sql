create extension if not exists "pgcrypto";

create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  service text,
  message text,
  status text not null default 'nuovo'
    check (status in ('nuovo', 'contattato', 'preventivo', 'cliente', 'perso')),
  source text not null default 'bmg_website',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'onboarding',
  services text[] not null default '{}',
  clickup_url text,
  drive_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_site_leads_updated_at on public.site_leads;
create trigger touch_site_leads_updated_at
before update on public.site_leads
for each row execute function public.touch_updated_at();

drop trigger if exists touch_site_content_updated_at on public.site_content;
create trigger touch_site_content_updated_at
before update on public.site_content
for each row execute function public.touch_updated_at();

drop trigger if exists touch_clients_updated_at on public.clients;
create trigger touch_clients_updated_at
before update on public.clients
for each row execute function public.touch_updated_at();

alter table public.site_leads enable row level security;
alter table public.site_content enable row level security;
alter table public.clients enable row level security;

-- Public site can read only published content when using the anon key.
drop policy if exists "Published content is public" on public.site_content;
create policy "Published content is public"
on public.site_content
for select
using (status = 'published');

-- Internal writes should use the service role key from serverless API only.
