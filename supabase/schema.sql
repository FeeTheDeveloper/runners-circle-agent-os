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

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, user_id)
);

create or replace function public.get_team_role(target_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = target_team_id
    and tm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_team_role(target_team_id) in ('owner', 'admin'), false);
$$;

create or replace function public.can_access_team_record(target_team_id uuid, owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when target_team_id is null then auth.uid() = owner_id
      else public.is_team_member(target_team_id) or auth.uid() = owner_id
    end;
$$;

create or replace function public.can_modify_team_record(target_team_id uuid, owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when target_team_id is null then auth.uid() = owner_id
      else coalesce(public.get_team_role(target_team_id) in ('owner', 'admin', 'operator', 'editor'), false)
    end;
$$;

create or replace function public.can_publish_team_record(target_team_id uuid, owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when target_team_id is null then auth.uid() = owner_id
      else coalesce(public.get_team_role(target_team_id) in ('owner', 'admin', 'operator', 'editor'), false)
    end;
$$;

create or replace function public.can_review_team_record(target_team_id uuid, owner_id uuid, reviewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when target_team_id is null then auth.uid() = owner_id or auth.uid() = reviewer_id
      else
        auth.uid() = reviewer_id
        or coalesce(public.get_team_role(target_team_id) in ('owner', 'admin', 'reviewer', 'operator'), false)
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

create table if not exists public.agent_execution_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  agent_id text not null,
  agent_name text not null,
  execution_mode text not null default 'manual',
  status text not null default 'draft',
  task_type text not null,
  priority text not null default 'normal',
  instruction_prompt text not null default '',
  context_payload jsonb not null default '{}'::jsonb,
  expected_output_schema jsonb not null default '{}'::jsonb,
  handoff_targets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_execution_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  package_id uuid not null references public.agent_execution_packages(id) on delete cascade,
  status text not null default 'draft',
  output_payload jsonb not null default '{}'::jsonb,
  review_notes text,
  next_recommended_agent_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_task_id uuid references public.agent_tasks(id) on delete set null,
  generation_type text not null,
  status text not null default 'queued',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  external_job_id text,
  external_id text,
  error_message text,
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

create table if not exists public.distribution_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  promotion_package_id uuid not null references public.promotion_packages(id) on delete cascade,
  channel text not null,
  provider text not null default 'manual',
  status text not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  published_url text,
  caption text,
  media_asset_ids jsonb not null default '[]'::jsonb,
  assigned_agent_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  template_id text not null,
  status text not null default 'draft',
  input_payload jsonb not null default '{}'::jsonb,
  steps_payload jsonb not null default '[]'::jsonb,
  current_step_id text,
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

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, user_id)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending_review',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  plan_tier text not null default 'free',
  billing_status text not null default 'trialing',
  provider text not null default 'mock',
  stripe_customer_id text,
  stripe_subscription_id text,
  reset_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  plan_tier text not null default 'free',
  image_credits integer,
  video_credits integer,
  agent_task_credits integer,
  workflow_credits integer,
  storage_limit_mb integer,
  storage_used_mb integer not null default 0,
  campaign_limit integer,
  distribution_limit integer,
  team_seat_limit integer,
  reset_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  type text not null,
  amount numeric not null default 1,
  related_entity_type text,
  related_entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_tier text not null unique,
  monthly_price numeric,
  yearly_price numeric,
  image_credits integer,
  video_credits integer,
  agent_task_credits integer,
  workflow_credits integer,
  storage_limit_mb integer,
  campaign_limit integer,
  distribution_limit integer,
  team_seat_limit integer,
  support_level text not null default 'standard',
  features jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
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

alter table public.media_assets add column if not exists external_id text;
alter table public.media_assets add column if not exists thumbnail_bucket text;
alter table public.media_assets add column if not exists thumbnail_path text;
alter table public.media_assets add column if not exists content_type text;
alter table public.media_assets add column if not exists file_name text;
alter table public.media_assets add column if not exists assigned_agent_id text;
alter table public.generation_jobs add column if not exists external_id text;
alter table public.campaigns add column if not exists external_id text;
alter table public.promotion_packages add column if not exists external_id text;
alter table public.agent_tasks add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.generation_jobs add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.media_assets add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.campaigns add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.promotion_packages add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.workflow_runs add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.agent_execution_packages add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.agent_execution_results add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists media_assets_user_id_idx on public.media_assets (user_id);
create index if not exists media_assets_status_idx on public.media_assets (status);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at desc);
create index if not exists media_assets_team_id_idx on public.media_assets (team_id);
create unique index if not exists media_assets_external_id_uidx on public.media_assets (external_id) where external_id is not null;
create unique index if not exists generation_jobs_external_id_uidx on public.generation_jobs (external_id) where external_id is not null;
create unique index if not exists campaigns_external_id_uidx on public.campaigns (external_id) where external_id is not null;
create unique index if not exists promotion_packages_external_id_uidx on public.promotion_packages (external_id) where external_id is not null;

create index if not exists campaigns_user_id_idx on public.campaigns (user_id);
create index if not exists campaigns_status_idx on public.campaigns (status);
create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);
create index if not exists campaigns_team_id_idx on public.campaigns (team_id);

create index if not exists campaign_assets_user_id_idx on public.campaign_assets (user_id);
create index if not exists campaign_assets_status_idx on public.campaign_assets (status);
create index if not exists campaign_assets_created_at_idx on public.campaign_assets (created_at desc);

create index if not exists promotion_packages_user_id_idx on public.promotion_packages (user_id);
create index if not exists promotion_packages_status_idx on public.promotion_packages (status);
create index if not exists promotion_packages_created_at_idx on public.promotion_packages (created_at desc);
create index if not exists promotion_packages_team_id_idx on public.promotion_packages (team_id);
create index if not exists distribution_jobs_team_id_idx on public.distribution_jobs (team_id);
create index if not exists distribution_jobs_status_idx on public.distribution_jobs (status);
create index if not exists distribution_jobs_channel_idx on public.distribution_jobs (channel);
create index if not exists distribution_jobs_scheduled_for_idx on public.distribution_jobs (scheduled_for);
create index if not exists distribution_jobs_created_at_idx on public.distribution_jobs (created_at desc);

create index if not exists generation_jobs_team_id_idx on public.generation_jobs (team_id);
create index if not exists agent_tasks_team_id_idx on public.agent_tasks (team_id);
create index if not exists workflow_runs_team_id_idx on public.workflow_runs (team_id);
create index if not exists workflow_runs_status_idx on public.workflow_runs (status);
create index if not exists workflow_runs_created_at_idx on public.workflow_runs (created_at desc);
create index if not exists agent_execution_packages_team_id_idx on public.agent_execution_packages (team_id);
create index if not exists agent_execution_packages_status_idx on public.agent_execution_packages (status);
create index if not exists agent_execution_results_team_id_idx on public.agent_execution_results (team_id);
create index if not exists agent_execution_results_status_idx on public.agent_execution_results (status);

create index if not exists download_events_user_id_idx on public.download_events (user_id);
create index if not exists download_events_created_at_idx on public.download_events (created_at desc);

create index if not exists activity_events_user_id_idx on public.activity_events (user_id);
create index if not exists activity_events_severity_idx on public.activity_events (severity);
create index if not exists activity_events_created_at_idx on public.activity_events (created_at desc);

create index if not exists brand_profiles_user_id_idx on public.brand_profiles (user_id);
create index if not exists brand_profiles_created_at_idx on public.brand_profiles (created_at desc);
create index if not exists teams_owner_user_id_idx on public.teams (owner_user_id);
create index if not exists teams_created_at_idx on public.teams (created_at desc);
create index if not exists team_members_team_id_idx on public.team_members (team_id);
create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists team_members_role_idx on public.team_members (role);
create index if not exists approval_requests_team_id_idx on public.approval_requests (team_id);
create index if not exists approval_requests_status_idx on public.approval_requests (status);
create index if not exists approval_requests_assigned_reviewer_id_idx on public.approval_requests (assigned_reviewer_id);
create index if not exists approval_requests_created_at_idx on public.approval_requests (created_at desc);
create index if not exists billing_accounts_user_id_idx on public.billing_accounts (user_id);
create index if not exists billing_accounts_team_id_idx on public.billing_accounts (team_id);
create index if not exists billing_accounts_status_idx on public.billing_accounts (billing_status);
create index if not exists usage_credit_balances_user_id_idx on public.usage_credit_balances (user_id);
create index if not exists usage_credit_balances_team_id_idx on public.usage_credit_balances (team_id);
create index if not exists usage_credit_balances_plan_tier_idx on public.usage_credit_balances (plan_tier);
create index if not exists usage_events_user_id_idx on public.usage_events (user_id);
create index if not exists usage_events_team_id_idx on public.usage_events (team_id);
create index if not exists usage_events_type_idx on public.usage_events (type);
create index if not exists usage_events_created_at_idx on public.usage_events (created_at desc);
create index if not exists plan_entitlements_plan_tier_idx on public.plan_entitlements (plan_tier);

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

drop trigger if exists set_agent_execution_packages_updated_at on public.agent_execution_packages;
create trigger set_agent_execution_packages_updated_at before update on public.agent_execution_packages
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_execution_results_updated_at on public.agent_execution_results;
create trigger set_agent_execution_results_updated_at before update on public.agent_execution_results
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

drop trigger if exists set_distribution_jobs_updated_at on public.distribution_jobs;
create trigger set_distribution_jobs_updated_at before update on public.distribution_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_runs_updated_at on public.workflow_runs;
create trigger set_workflow_runs_updated_at before update on public.workflow_runs
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

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists set_approval_requests_updated_at on public.approval_requests;
create trigger set_approval_requests_updated_at before update on public.approval_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_accounts_updated_at on public.billing_accounts;
create trigger set_billing_accounts_updated_at before update on public.billing_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_usage_credit_balances_updated_at on public.usage_credit_balances;
create trigger set_usage_credit_balances_updated_at before update on public.usage_credit_balances
for each row execute function public.set_updated_at();

drop trigger if exists set_usage_events_updated_at on public.usage_events;
create trigger set_usage_events_updated_at before update on public.usage_events
for each row execute function public.set_updated_at();

drop trigger if exists set_plan_entitlements_updated_at on public.plan_entitlements;
create trigger set_plan_entitlements_updated_at before update on public.plan_entitlements
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_outputs enable row level security;
alter table public.agent_execution_packages enable row level security;
alter table public.agent_execution_results enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.media_assets enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_assets enable row level security;
alter table public.promotion_packages enable row level security;
alter table public.distribution_jobs enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.download_events enable row level security;
alter table public.activity_events enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.approval_requests enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.usage_credit_balances enable row level security;
alter table public.usage_events enable row level security;
alter table public.plan_entitlements enable row level security;

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
create policy "Users or team members read agent tasks" on public.agent_tasks
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage agent tasks" on public.agent_tasks;
create policy "Users or team collaborators manage agent tasks" on public.agent_tasks
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users manage own agent outputs" on public.agent_outputs;
create policy "Users manage own agent outputs" on public.agent_outputs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own generation jobs" on public.generation_jobs;
create policy "Users or team members read generation jobs" on public.generation_jobs
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage generation jobs" on public.generation_jobs;
create policy "Users or team collaborators manage generation jobs" on public.generation_jobs
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users manage own media assets" on public.media_assets;
create policy "Users or team members read media assets" on public.media_assets
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage media assets" on public.media_assets;
create policy "Users or team collaborators manage media assets" on public.media_assets
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users manage own campaigns" on public.campaigns;
create policy "Users or team members read campaigns" on public.campaigns
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage campaigns" on public.campaigns;
create policy "Users or team collaborators manage campaigns" on public.campaigns
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users manage own campaign assets" on public.campaign_assets;
create policy "Users manage own campaign assets" on public.campaign_assets
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own promotion packages" on public.promotion_packages;
create policy "Users or team members read promotion packages" on public.promotion_packages
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage promotion packages" on public.promotion_packages;
create policy "Users or team collaborators manage promotion packages" on public.promotion_packages
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users or team members read distribution jobs" on public.distribution_jobs;
create policy "Users or team members read distribution jobs" on public.distribution_jobs
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage distribution jobs" on public.distribution_jobs;
create policy "Users or team collaborators manage distribution jobs" on public.distribution_jobs
for all using (public.can_publish_team_record(team_id, user_id))
with check (public.can_publish_team_record(team_id, user_id));

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

drop policy if exists "Users or team members read workflow runs" on public.workflow_runs;
create policy "Users or team members read workflow runs" on public.workflow_runs
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage workflow runs" on public.workflow_runs;
create policy "Users or team collaborators manage workflow runs" on public.workflow_runs
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users or team members read execution packages" on public.agent_execution_packages;
create policy "Users or team members read execution packages" on public.agent_execution_packages
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage execution packages" on public.agent_execution_packages;
create policy "Users or team collaborators manage execution packages" on public.agent_execution_packages
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users or team members read execution results" on public.agent_execution_results;
create policy "Users or team members read execution results" on public.agent_execution_results
for select using (public.can_access_team_record(team_id, user_id));

drop policy if exists "Users or team collaborators manage execution results" on public.agent_execution_results;
create policy "Users or team collaborators manage execution results" on public.agent_execution_results
for all using (public.can_modify_team_record(team_id, user_id))
with check (public.can_modify_team_record(team_id, user_id));

drop policy if exists "Users read their teams" on public.teams;
create policy "Users read their teams" on public.teams
for select using (owner_user_id = auth.uid() or public.is_team_member(id));

drop policy if exists "Users create teams they own" on public.teams;
create policy "Users create teams they own" on public.teams
for insert with check (owner_user_id = auth.uid());

drop policy if exists "Owners and admins manage teams" on public.teams;
create policy "Owners and admins manage teams" on public.teams
for update using (owner_user_id = auth.uid() or public.can_manage_team(id))
with check (owner_user_id = auth.uid() or public.can_manage_team(id));

drop policy if exists "Owners and admins delete teams" on public.teams;
create policy "Owners and admins delete teams" on public.teams
for delete using (owner_user_id = auth.uid() or public.can_manage_team(id));

drop policy if exists "Team members read memberships" on public.team_members;
create policy "Team members read memberships" on public.team_members
for select using (public.is_team_member(team_id) or user_id = auth.uid());

drop policy if exists "Owners and admins manage memberships" on public.team_members;
create policy "Owners and admins manage memberships" on public.team_members
for all using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

drop policy if exists "Team members read approval requests" on public.approval_requests;
create policy "Team members read approval requests" on public.approval_requests
for select using (public.can_access_team_record(team_id, requested_by));

drop policy if exists "Collaborators create approval requests" on public.approval_requests;
create policy "Collaborators create approval requests" on public.approval_requests
for insert with check (public.can_modify_team_record(team_id, requested_by));

drop policy if exists "Reviewers update approval requests" on public.approval_requests;
create policy "Reviewers update approval requests" on public.approval_requests
for update using (public.can_review_team_record(team_id, requested_by, assigned_reviewer_id))
with check (public.can_review_team_record(team_id, requested_by, assigned_reviewer_id));

drop policy if exists "Owners and admins delete approval requests" on public.approval_requests;
create policy "Owners and admins delete approval requests" on public.approval_requests
for delete using (public.can_manage_team(team_id) or auth.uid() = requested_by);

drop policy if exists "Users and billing admins read billing accounts" on public.billing_accounts;
create policy "Users and billing admins read billing accounts" on public.billing_accounts
for select using (
  auth.uid() = user_id
  or (team_id is not null and coalesce(public.get_team_role(team_id) in ('owner', 'admin'), false))
);

drop policy if exists "Users and billing admins read usage balances" on public.usage_credit_balances;
create policy "Users and billing admins read usage balances" on public.usage_credit_balances
for select using (
  auth.uid() = user_id
  or (team_id is not null and coalesce(public.get_team_role(team_id) in ('owner', 'admin'), false))
);

drop policy if exists "Users and billing admins read usage events" on public.usage_events;
create policy "Users and billing admins read usage events" on public.usage_events
for select using (
  auth.uid() = user_id
  or (team_id is not null and coalesce(public.get_team_role(team_id) in ('owner', 'admin'), false))
);

drop policy if exists "Authenticated users read plan entitlements" on public.plan_entitlements;
create policy "Authenticated users read plan entitlements" on public.plan_entitlements
for select to authenticated using (true);

-- TODO: Add assignee-specific RLS once explicit assigned_user_id columns are introduced on collaborative records.
-- TODO: Allow only service role mutation for billing tables when live billing persistence is enabled.
