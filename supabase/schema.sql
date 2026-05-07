create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role_label text default 'operator',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null unique,
  name text not null,
  role text not null,
  description text not null default '',
  capabilities jsonb not null default '[]'::jsonb,
  accepted_task_types jsonb not null default '[]'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  status text not null default 'available',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null references public.agents(agent_key) on delete restrict,
  task_type text not null,
  priority text not null default 'normal',
  status text not null default 'queued',
  input_payload jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  next_step text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_task_id uuid not null references public.agent_tasks(id) on delete cascade,
  agent_key text not null references public.agents(agent_key) on delete restrict,
  status text not null default 'draft',
  output_payload jsonb not null default '{}'::jsonb,
  review_notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_task_id uuid references public.agent_tasks(id) on delete set null,
  generation_type text not null,
  status text not null default 'queued',
  provider text,
  progress integer not null default 0,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  external_job_id text,
  external_id text,
  error_message text,
  media_asset_id uuid,
  assigned_agent_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  external_id text,
  title text not null,
  prompt text not null default '',
  media_type text not null,
  status text not null default 'generated',
  storage_bucket text,
  storage_path text,
  thumbnail_bucket text,
  thumbnail_path text,
  thumbnail_url text,
  media_url text,
  content_type text,
  file_name text,
  assigned_agent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text,
  name text not null,
  objective text not null,
  status text not null default 'draft',
  channels jsonb not null default '[]'::jsonb,
  assigned_media_ids jsonb not null default '[]'::jsonb,
  assigned_agent_key text references public.agents(agent_key) on delete set null,
  target_audience text,
  core_message text,
  next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  role text,
  channel text,
  status text not null default 'assigned',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.promotion_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  external_id text,
  assigned_agent_key text references public.agents(agent_key) on delete set null,
  media_asset_ids jsonb not null default '[]'::jsonb,
  channels jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  caption_set jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  tone text,
  call_to_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  downloaded_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  severity text not null default 'info',
  title text not null,
  description text not null default '',
  related_entity_type text not null,
  related_entity_id text not null,
  actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tone text,
  visual_direction text,
  brand_values jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

create index if not exists agents_user_id_idx on public.agents (user_id);
create index if not exists agents_status_idx on public.agents (status);
create index if not exists agents_created_at_idx on public.agents (created_at desc);

create index if not exists agent_tasks_user_id_idx on public.agent_tasks (user_id);
create index if not exists agent_tasks_status_idx on public.agent_tasks (status);
create index if not exists agent_tasks_created_at_idx on public.agent_tasks (created_at desc);

create index if not exists agent_outputs_user_id_idx on public.agent_outputs (user_id);
create index if not exists agent_outputs_status_idx on public.agent_outputs (status);
create index if not exists agent_outputs_created_at_idx on public.agent_outputs (created_at desc);

create index if not exists generation_jobs_user_id_idx on public.generation_jobs (user_id);
create index if not exists generation_jobs_status_idx on public.generation_jobs (status);
create index if not exists generation_jobs_created_at_idx on public.generation_jobs (created_at desc);

alter table public.generation_jobs add column if not exists provider text;
alter table public.generation_jobs add column if not exists progress integer not null default 0;
alter table public.generation_jobs add column if not exists media_asset_id uuid;
alter table public.generation_jobs add column if not exists assigned_agent_id text;

alter table public.generation_jobs drop constraint if exists generation_jobs_media_asset_id_fkey;
alter table public.generation_jobs add constraint generation_jobs_media_asset_id_fkey
  foreign key (media_asset_id) references public.media_assets(id) on delete set null;

create index if not exists generation_jobs_type_idx on public.generation_jobs (generation_type);
create index if not exists generation_jobs_provider_idx on public.generation_jobs (provider);

alter table public.media_assets add column if not exists external_id text;
alter table public.media_assets add column if not exists thumbnail_bucket text;
alter table public.media_assets add column if not exists thumbnail_path text;
alter table public.media_assets add column if not exists content_type text;
alter table public.media_assets add column if not exists file_name text;
alter table public.media_assets add column if not exists assigned_agent_id text;
alter table public.generation_jobs add column if not exists external_id text;
alter table public.campaigns add column if not exists external_id text;
alter table public.promotion_packages add column if not exists external_id text;

create index if not exists media_assets_user_id_idx on public.media_assets (user_id);
create index if not exists media_assets_status_idx on public.media_assets (status);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at desc);
create unique index if not exists media_assets_external_id_uidx on public.media_assets (external_id) where external_id is not null;
create unique index if not exists generation_jobs_external_id_uidx on public.generation_jobs (external_id) where external_id is not null;
create unique index if not exists campaigns_external_id_uidx on public.campaigns (external_id) where external_id is not null;
create unique index if not exists promotion_packages_external_id_uidx on public.promotion_packages (external_id) where external_id is not null;

create index if not exists campaigns_user_id_idx on public.campaigns (user_id);
create index if not exists campaigns_status_idx on public.campaigns (status);
create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);

create index if not exists campaign_assets_user_id_idx on public.campaign_assets (user_id);
create index if not exists campaign_assets_status_idx on public.campaign_assets (status);
create index if not exists campaign_assets_created_at_idx on public.campaign_assets (created_at desc);

create index if not exists promotion_packages_user_id_idx on public.promotion_packages (user_id);
create index if not exists promotion_packages_status_idx on public.promotion_packages (status);
create index if not exists promotion_packages_created_at_idx on public.promotion_packages (created_at desc);

create index if not exists download_events_user_id_idx on public.download_events (user_id);
create index if not exists download_events_created_at_idx on public.download_events (created_at desc);

create index if not exists activity_events_user_id_idx on public.activity_events (user_id);
create index if not exists activity_events_severity_idx on public.activity_events (severity);
create index if not exists activity_events_created_at_idx on public.activity_events (created_at desc);

create index if not exists brand_profiles_user_id_idx on public.brand_profiles (user_id);
create index if not exists brand_profiles_created_at_idx on public.brand_profiles (created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_agents_updated_at on public.agents;
create trigger set_agents_updated_at before update on public.agents
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_tasks_updated_at on public.agent_tasks;
create trigger set_agent_tasks_updated_at before update on public.agent_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_outputs_updated_at on public.agent_outputs;
create trigger set_agent_outputs_updated_at before update on public.agent_outputs
for each row execute function public.set_updated_at();

drop trigger if exists set_generation_jobs_updated_at on public.generation_jobs;
create trigger set_generation_jobs_updated_at before update on public.generation_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at before update on public.media_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_campaign_assets_updated_at on public.campaign_assets;
create trigger set_campaign_assets_updated_at before update on public.campaign_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_promotion_packages_updated_at on public.promotion_packages;
create trigger set_promotion_packages_updated_at before update on public.promotion_packages
for each row execute function public.set_updated_at();

drop trigger if exists set_download_events_updated_at on public.download_events;
create trigger set_download_events_updated_at before update on public.download_events
for each row execute function public.set_updated_at();

drop trigger if exists set_activity_events_updated_at on public.activity_events;
create trigger set_activity_events_updated_at before update on public.activity_events
for each row execute function public.set_updated_at();

drop trigger if exists set_brand_profiles_updated_at on public.brand_profiles;
create trigger set_brand_profiles_updated_at before update on public.brand_profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_outputs enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.media_assets enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_assets enable row level security;
alter table public.promotion_packages enable row level security;
alter table public.download_events enable row level security;
alter table public.activity_events enable row level security;
alter table public.brand_profiles enable row level security;

drop policy if exists "Users manage own profiles" on public.profiles;
create policy "Users manage own profiles" on public.profiles
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read agents" on public.agents;
create policy "Authenticated users can read agents" on public.agents
for select to authenticated using (true);

drop policy if exists "Users manage own agents" on public.agents;
create policy "Users manage own agents" on public.agents
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own agent tasks" on public.agent_tasks;
create policy "Users manage own agent tasks" on public.agent_tasks
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own agent outputs" on public.agent_outputs;
create policy "Users manage own agent outputs" on public.agent_outputs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own generation jobs" on public.generation_jobs;
create policy "Users manage own generation jobs" on public.generation_jobs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own media assets" on public.media_assets;
create policy "Users manage own media assets" on public.media_assets
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own campaigns" on public.campaigns;
create policy "Users manage own campaigns" on public.campaigns
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own campaign assets" on public.campaign_assets;
create policy "Users manage own campaign assets" on public.campaign_assets
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own promotion packages" on public.promotion_packages;
create policy "Users manage own promotion packages" on public.promotion_packages
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own download events" on public.download_events;
create policy "Users manage own download events" on public.download_events
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own activity events" on public.activity_events;
create policy "Users manage own activity events" on public.activity_events
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own brand profiles" on public.brand_profiles;
create policy "Users manage own brand profiles" on public.brand_profiles
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);
