import type { ActivityEntityType, ActivitySeverity, ActivityType } from "@/lib/types/activity";
import type { AgentStatus, AgentTaskPriority, AgentTaskStatus, AgentTaskType } from "@/lib/types/agents";
import type { CampaignAssetStatus, CampaignChannel, CampaignObjective, CampaignStatus } from "@/lib/types/campaigns";
import type { GenerationStatus, GenerationType } from "@/lib/types/generation";
import type { MediaStatus, MediaType } from "@/lib/types/media";
import type { PromotionChannel, PromotionStatus } from "@/lib/types/promotions";

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
  created_at: string;
  updated_at: string;
}

export interface AgentTaskRow {
  id: string;
  user_id: string;
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

export interface GenerationJobRow {
  id: string;
  user_id: string;
  agent_task_id: string | null;
  generation_type: GenerationType;
  status: GenerationStatus;
  input_payload: Json;
  output_payload: Json;
  external_job_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetRow {
  id: string;
  user_id: string;
  generation_job_id: string | null;
  title: string;
  prompt: string;
  media_type: MediaType;
  status: MediaStatus;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow {
  id: string;
  user_id: string;
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
  campaign_id: string;
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
  tone: string | null;
  visual_direction: string | null;
  brand_values: Json;
  defaults: Json;
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow>;
        Update: Updatable<ProfileRow>;
      };
      agents: {
        Row: AgentRow;
        Insert: Insertable<AgentRow>;
        Update: Updatable<AgentRow>;
      };
      agent_tasks: {
        Row: AgentTaskRow;
        Insert: Insertable<AgentTaskRow>;
        Update: Updatable<AgentTaskRow>;
      };
      agent_outputs: {
        Row: AgentOutputRow;
        Insert: Insertable<AgentOutputRow>;
        Update: Updatable<AgentOutputRow>;
      };
      generation_jobs: {
        Row: GenerationJobRow;
        Insert: Insertable<GenerationJobRow>;
        Update: Updatable<GenerationJobRow>;
      };
      media_assets: {
        Row: MediaAssetRow;
        Insert: Insertable<MediaAssetRow>;
        Update: Updatable<MediaAssetRow>;
      };
      campaigns: {
        Row: CampaignRow;
        Insert: Insertable<CampaignRow>;
        Update: Updatable<CampaignRow>;
      };
      campaign_assets: {
        Row: CampaignAssetRow;
        Insert: Insertable<CampaignAssetRow>;
        Update: Updatable<CampaignAssetRow>;
      };
      promotion_packages: {
        Row: PromotionPackageRow;
        Insert: Insertable<PromotionPackageRow>;
        Update: Updatable<PromotionPackageRow>;
      };
      download_events: {
        Row: DownloadEventRow;
        Insert: Insertable<DownloadEventRow>;
        Update: Updatable<DownloadEventRow>;
      };
      activity_events: {
        Row: ActivityEventRow;
        Insert: Insertable<ActivityEventRow>;
        Update: Updatable<ActivityEventRow>;
      };
      brand_profiles: {
        Row: BrandProfileRow;
        Insert: Insertable<BrandProfileRow>;
        Update: Updatable<BrandProfileRow>;
      };
    };
  };
}

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
