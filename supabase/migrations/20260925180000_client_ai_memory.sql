create table if not exists public.client_ai_profiles (
  client_id uuid primary key references public.clients(id) on delete cascade,
  industry text,
  business_description text,
  audience text,
  brand_voice text,
  objectives text,
  services_focus text,
  must_include text,
  avoid_topics text,
  preferred_language text not null default 'it',
  learned_patterns jsonb not null default '[]'::jsonb
    check (jsonb_typeof(learned_patterns) = 'array'),
  profile_version integer not null default 1 check (profile_version > 0),
  updated_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_copy_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entity_type text not null default 'draft'
    check (entity_type in ('draft', 'ped', 'staging')),
  entity_id text,
  copy_hash text not null,
  caption_snapshot text not null,
  profile_version integer not null default 1,
  structure_score integer not null check (structure_score between 0 and 100),
  semantic_score integer not null check (semantic_score between 0 and 100),
  overall_score integer not null check (overall_score between 0 and 100),
  verdict text not null check (verdict in ('poor', 'fair', 'good', 'excellent')),
  summary text,
  dimensions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(dimensions) = 'object'),
  strengths jsonb not null default '[]'::jsonb
    check (jsonb_typeof(strengths) = 'array'),
  improvements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(improvements) = 'array'),
  context_warnings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(context_warnings) = 'array'),
  team_feedback text check (team_feedback in ('approved', 'rejected')),
  reviewed_by uuid references public.staff_profiles(id) on delete set null,
  feedback_by uuid references public.staff_profiles(id) on delete set null,
  feedback_at timestamptz,
  model text,
  estimated_cost_usd numeric(12, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, copy_hash, profile_version)
);

create index if not exists client_copy_reviews_client_time_idx
  on public.client_copy_reviews(client_id, created_at desc);
create index if not exists client_copy_reviews_entity_idx
  on public.client_copy_reviews(entity_type, entity_id)
  where entity_id is not null;
create index if not exists client_copy_reviews_feedback_idx
  on public.client_copy_reviews(client_id, team_feedback, created_at desc)
  where team_feedback is not null;

drop trigger if exists touch_client_ai_profiles_updated_at on public.client_ai_profiles;
create trigger touch_client_ai_profiles_updated_at
before update on public.client_ai_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_client_copy_reviews_updated_at on public.client_copy_reviews;
create trigger touch_client_copy_reviews_updated_at
before update on public.client_copy_reviews
for each row execute function public.touch_updated_at();

alter table public.client_ai_profiles enable row level security;
alter table public.client_copy_reviews enable row level security;
revoke all on public.client_ai_profiles from anon, authenticated;
revoke all on public.client_copy_reviews from anon, authenticated;
grant select, insert, update, delete on public.client_ai_profiles to service_role;
grant select, insert, update, delete on public.client_copy_reviews to service_role;
