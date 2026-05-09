import type { ActivityEntityType, ActivitySeverity, ActivityType } from "@/lib/types/activity";
import type { AgentPriorityLevel, AgentStatus, AgentTaskPriority, AgentTaskStatus, AgentTaskType } from "@/lib/types/agents";
import type { AgentExecutionMode, AgentExecutionStatus } from "@/lib/types/agent-execution";
import type { BillingProvider, BillingStatus, PlanTier, UsageEventType } from "@/lib/types/billing";
import type { BrandModeSettings, BrandProfile } from "@/lib/types/brand";
import type { CampaignAssetStatus, CampaignChannel, CampaignObjective, CampaignStatus } from "@/lib/types/campaigns";
import type { GenerationStatus, GenerationType } from "@/lib/types/generation";
import type { MediaStatus, MediaType } from "@/lib/types/media";
import type { DistributionChannel, DistributionStatus, PublishingProvider } from "@/lib/types/distribution";
import type { PromotionChannel, PromotionStatus } from "@/lib/types/promotions";
import type { ApprovalEntityType, ReviewStatus, TeamRole } from "@/lib/types/team";
import type { WorkflowStatus } from "@/lib/types/workflows";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface ProfileRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role_label: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface AgentRow {
  id: string;
  user_id: string;
  agent_key: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  accepted_task_types: AgentTaskType[];
  output_schema: Json;
  status: AgentStatus;
  priority_level: AgentPriorityLevel;
  handoff_targets: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentTaskRow {
  id: string;
  user_id: string;
  team_id: string | null;
  agent_key: string;
  task_type: AgentTaskType;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  input_payload: Json;
  output_schema: Json;
  next_step: string;
  created_at: string;
  updated_at: string;
}

export interface AgentOutputRow {
  id: string;
  user_id: string;
  agent_task_id: string;
  agent_key: string;
  status: string;
  output_payload: Json;
  review_notes: Json;
  created_at: string;
  updated_at: string;
}

export interface AgentExecutionPackageRow {
  id: string;
  user_id: string;
  team_id: string | null;
  task_id: string;
  agent_id: string;
  agent_name: string;
  execution_mode: AgentExecutionMode;
  status: AgentExecutionStatus;
  task_type: AgentTaskType;
  priority: AgentTaskPriority;
  instruction_prompt: string;
  context_payload: Json;
  expected_output_schema: Json;
  handoff_targets: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentExecutionResultRow {
  id: string;
  user_id: string;
  team_id: string | null;
  package_id: string;
  status: AgentExecutionStatus;
  output_payload: Json;
  review_notes: string | null;
  next_recommended_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationJobRow {
  id: string;
  user_id: string;
  team_id: string | null;
  agent_task_id: string | null;
  generation_type: GenerationType;
  status: GenerationStatus;
  input_payload: Json;
  output_payload: Json;
  external_job_id: string | null;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetRow {
  id: string;
  user_id: string;
  team_id: string | null;
  generation_job_id: string | null;
  external_id: string | null;
  title: string;
  prompt: string;
  media_type: MediaType;
  status: MediaStatus;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  content_type: string | null;
  file_name: string | null;
  assigned_agent_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow {
  id: string;
  user_id: string;
  team_id: string | null;
  external_id: string | null;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  channels: CampaignChannel[];
  assigned_media_ids: string[];
  assigned_agent_key: string | null;
  target_audience: string | null;
  core_message: string | null;
  next_action: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CampaignAssetRow {
  id: string;
  user_id: string;
  campaign_id: string;
  media_asset_id: string;
  role: string | null;
  channel: CampaignChannel | null;
  status: CampaignAssetStatus;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PromotionPackageRow {
  id: string;
  user_id: string;
  team_id: string | null;
  campaign_id: string;
  external_id: string | null;
  assigned_agent_key: string | null;
  media_asset_ids: string[];
  channels: PromotionChannel[];
  status: PromotionStatus;
  caption_set: Json;
  checklist: Json;
  tone: string | null;
  call_to_action: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface DownloadEventRow {
  id: string;
  user_id: string;
  media_asset_id: string;
  file_name: string;
  file_type: string;
  downloaded_at: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ActivityEventRow {
  id: string;
  user_id: string;
  type: ActivityType;
  severity: ActivitySeverity;
  title: string;
  description: string;
  related_entity_type: ActivityEntityType;
  related_entity_id: string;
  actor: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface BrandProfileRow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  typography_style: string | null;
  visual_style: string | null;
  motion_style: string | null;
  tone: BrandProfile["tone"] | null;
  tagline: string | null;
  audience: string | null;
  keywords: string[];
  banned_words: string[];
  preferred_platforms: string[];
  logo_url: string | null;
  brand_voice_notes: string | null;
  call_to_action_style: string | null;
  mode_settings: BrandModeSettings | Json;
  created_at: string;
  updated_at: string;
}

export interface DistributionJobRow {
  id: string;
  user_id: string;
  team_id: string | null;
  campaign_id: string;
  promotion_package_id: string;
  channel: DistributionChannel;
  provider: PublishingProvider;
  status: DistributionStatus;
  scheduled_for: string | null;
  published_at: string | null;
  published_url: string | null;
  caption: string | null;
  media_asset_ids: string[];
  assigned_agent_id: string | null;
  error_message: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunRow {
  id: string;
  user_id: string;
  team_id: string | null;
  template_id: string;
  status: WorkflowStatus;
  input_payload: Json;
  steps_payload: Json;
  current_step_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  invited_by: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequestRow {
  id: string;
  team_id: string | null;
  entity_type: ApprovalEntityType;
  entity_id: string;
  requested_by: string;
  assigned_reviewer_id: string | null;
  status: ReviewStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingAccountRow {
  id: string;
  user_id: string;
  team_id: string | null;
  plan_tier: PlanTier;
  billing_status: BillingStatus;
  provider: BillingProvider;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  reset_at: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface UsageCreditBalanceRow {
  id: string;
  user_id: string;
  team_id: string | null;
  plan_tier: PlanTier;
  image_credits: number | null;
  video_credits: number | null;
  agent_task_credits: number | null;
  workflow_credits: number | null;
  storage_limit_mb: number | null;
  storage_used_mb: number;
  campaign_limit: number | null;
  distribution_limit: number | null;
  team_seat_limit: number | null;
  reset_at: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface UsageEventRow {
  id: string;
  user_id: string;
  team_id: string | null;
  type: UsageEventType;
  amount: number;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlementRow {
  id: string;
  plan_tier: PlanTier;
  monthly_price: number | null;
  yearly_price: number | null;
  image_credits: number | null;
  video_credits: number | null;
  agent_task_credits: number | null;
  workflow_credits: number | null;
  storage_limit_mb: number | null;
  campaign_limit: number | null;
  distribution_limit: number | null;
  team_seat_limit: number | null;
  support_level: string;
  features: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type Updatable<T> = Partial<Omit<T, "id" | "created_at" | "updated_at">> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type TableDefinition<Row> = {
  Row: Row & Record<string, unknown>;
  Insert: Insertable<Row> & Record<string, unknown>;
  Update: Updatable<Row> & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow>;
      agents: TableDefinition<AgentRow>;
      agent_tasks: TableDefinition<AgentTaskRow>;
      agent_outputs: TableDefinition<AgentOutputRow>;
      agent_execution_packages: TableDefinition<AgentExecutionPackageRow>;
      agent_execution_results: TableDefinition<AgentExecutionResultRow>;
      generation_jobs: TableDefinition<GenerationJobRow>;
      media_assets: TableDefinition<MediaAssetRow>;
      campaigns: TableDefinition<CampaignRow>;
      campaign_assets: TableDefinition<CampaignAssetRow>;
      promotion_packages: TableDefinition<PromotionPackageRow>;
      distribution_jobs: TableDefinition<DistributionJobRow>;
      workflow_runs: TableDefinition<WorkflowRunRow>;
      teams: TableDefinition<TeamRow>;
      team_members: TableDefinition<TeamMemberRow>;
      approval_requests: TableDefinition<ApprovalRequestRow>;
      billing_accounts: TableDefinition<BillingAccountRow>;
      usage_credit_balances: TableDefinition<UsageCreditBalanceRow>;
      usage_events: TableDefinition<UsageEventRow>;
      plan_entitlements: TableDefinition<PlanEntitlementRow>;
      download_events: TableDefinition<DownloadEventRow>;
      activity_events: TableDefinition<ActivityEventRow>;
      brand_profiles: TableDefinition<BrandProfileRow>;
    };
    Views: {};
    Functions: {};
  };
}

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
