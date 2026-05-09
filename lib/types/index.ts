import type {
  AgentCapability,
  AgentPriorityLevel,
  AgentStatus,
  AgentTaskPriority,
  AgentTaskStatus,
  AgentTaskType,
} from "@/lib/types/agents";
export {
  agentStatuses,
  agentPriorityLevels,
  agentTaskPriorities,
  agentTaskStatuses,
  agentTaskTypes,
} from "@/lib/types/agents";

export { agentExecutionModes, agentExecutionStatuses } from "@/lib/types/agent-execution";
export { billingProviders, billingStatuses, planTiers, usageEnforcementModes, usageEventTypes } from "@/lib/types/billing";
export { brandModeStrictnessLevels, brandTones } from "@/lib/types/brand";
export { distributionChannels, distributionStatuses, publishingProviders } from "@/lib/types/distribution";
export { stripeBillingIntervals, stripeCheckoutModes, stripeWebhookEventTypes } from "@/lib/types/stripe";
export { approvalEntityTypes, reviewStatuses, teamRoles } from "@/lib/types/team";
export { workflowStatuses, workflowStepStatuses, workflowStepTypes } from "@/lib/types/workflows";

export type {
  AgentCapability,
  AgentCoverageMapItem,
  AgentOutputSchema,
  AgentOutputSchemaField,
  AgentExecutionStep,
  AgentHandoffStep,
  AgentPipelineViewItem,
  AgentPriorityLevel,
  AgentRegistryEntry,
  AgentRoutingReadinessSummary,
  AgentRoutingResult,
  AgentStatus,
  AgentTaskInput,
  AgentTaskMutationFailure,
  AgentTaskMutationResult,
  AgentTaskMutationSuccess,
  AgentTaskPriority,
  AgentTaskStatus,
  AgentTaskType,
  AgentTaskValidationFailure,
  AgentTaskValidationResult,
  AgentTaskValidationSuccess,
  AssignAgentApiError,
  AssignAgentApiSuccess,
  CreateAgentTaskInput,
  RouteTaskToAgentInput,
} from "@/lib/types/agents";

export type {
  AgentExecutionMode,
  AgentExecutionPackage,
  AgentExecutionResult,
  AgentExecutionStatus,
  RecordExecutionResultInput,
} from "@/lib/types/agent-execution";

export type {
  BillingAccount,
  BillingProvider,
  BillingReadiness,
  BillingStatus,
  ConsumeUsageCreditInput,
  PlanFeature,
  PlanTier,
  RecordUsageEventInput,
  UpgradeOption,
  UsageCheckInput,
  UsageCheckResult,
  UsageCreditBalance,
  UsageEnforcementMode,
  UsageEvent,
  UsageEventType,
  UsageRemaining,
  UsageSnapshot,
} from "@/lib/types/billing";

export type {
  StripeBillingInterval,
  StripeCheckoutInput,
  StripeCheckoutMode,
  StripePortalInput,
  StripeSyncResult,
  StripeWebhookEventType,
} from "@/lib/types/stripe";

export type {
  BrandModeSettings,
  BrandModeStrictness,
  BrandProfile,
  BrandPromptModifierResult,
  BrandTone,
  BrandValidationResult,
  BrandVoiceApplicationResult,
  UpdateBrandProfileInput,
} from "@/lib/types/brand";

export type {
  CreateDistributionJobInput,
  CreateDistributionJobsFromPromotionInput,
  DistributionChannel,
  DistributionChannelAdapter,
  DistributionChannelBreakdownItem,
  DistributionError,
  DistributionErrorCode,
  DistributionJob,
  DistributionJobFilters,
  DistributionMockPublishResponse,
  DistributionNormalizedResult,
  DistributionOperationalSummary,
  DistributionPayload,
  DistributionPublishRequest,
  DistributionReadinessSummary,
  DistributionResponse,
  DistributionStatus,
  DistributionSuccess,
  DistributionValidationResult,
  PublishingProvider,
} from "@/lib/types/distribution";

export type {
  ApprovalEntityType,
  ApprovalRequest,
  CreateApprovalRequestInput,
  CreateTeamInput,
  InviteTeamMemberInput,
  ReviewStatus,
  Team,
  TeamMember,
  TeamRole,
} from "@/lib/types/team";

export type {
  WorkflowOperationalSummary,
  WorkflowProgress,
  WorkflowRun,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepStatus,
  WorkflowStepType,
  WorkflowTemplate,
  WorkflowTemplateStep,
} from "@/lib/types/workflows";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export const moduleKeys = [
  "dashboard",
  "studio",
  "agents",
  "workflows",
  "media",
  "campaigns",
  "promotions",
  "distribution",
  "billing",
  "team",
  "reviews",
  "operator",
  "settings",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];

export type GenerationKind = "image" | "video";
export type GenerationStatus = "queued" | "processing" | "awaiting-agent" | "completed" | "failed";
export type MediaAssetStatus = "draft" | "processing" | "ready" | "archived";
export type CampaignStatus = "draft" | "assembling" | "ready" | "launched";
export type PromotionStatus = "draft" | "preparing" | "ready" | "exported";
export type ActivitySeverity = "info" | "success" | "warning" | "error";

export interface MediaAssetPreview {
  id: string;
  title: string;
  kind: GenerationKind;
  status: MediaAssetStatus;
  storageBucket: string;
  dimensions: string;
  durationLabel?: string;
  prompt: string;
}

export interface CampaignPreview {
  id: string;
  title: string;
  objective: string;
  status: CampaignStatus;
  channels: string[];
  assetCount: number;
}

export interface PromotionPreview {
  id: string;
  title: string;
  status: PromotionStatus;
  channels: string[];
  deliverables: string[];
}

export interface ActivityPreviewItem {
  id: string;
  eventType: string;
  message: string;
  severity: ActivitySeverity;
  timestamp: string;
  module: ModuleKey;
}

export interface MetricCard {
  label: string;
  value: string;
  detail: string;
}

export interface RuntimeStatus {
  supabase: boolean;
  serviceRole: boolean;
  openAi: boolean;
  storageBucket: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  title?: string;
  agentId?: string;
  aspectRatio?: string;
  styleNotes?: string;
  modelTarget?: string;
  profileId?: string | null;
  requestedBy?: string | null;
  seedImageUrl?: string | null;
}

export interface VideoGenerationRequest {
  prompt: string;
  title?: string;
  agentId?: string;
  durationSeconds?: number;
  motionStyle?: string;
  modelTarget?: string;
  profileId?: string | null;
  requestedBy?: string | null;
  referenceAssetId?: string | null;
}

export interface PromotionPreparationRequest {
  campaignId?: string;
  campaignTitle?: string;
  objective: string;
  assetIds: string[];
  channels: string[];
  notes?: string;
  profileId?: string | null;
}

export interface MediaDownloadRequest {
  assetId: string;
  profileId?: string | null;
  source?: string;
}

export interface ServiceFailure {
  ok: false;
  code: "configuration_required" | "not_found" | "validation_error" | "unknown_error";
  message: string;
}

export interface ServiceSuccess<T> {
  ok: true;
  data: T;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          name: string;
          role: string;
          description: string;
          status: AgentStatus;
          priority_level: AgentPriorityLevel;
          capabilities: AgentCapability[];
          accepted_task_types: AgentTaskType[];
          handoff_targets: string[];
          output_schema: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: string;
          description: string;
          status?: AgentStatus;
          priority_level?: AgentPriorityLevel;
          capabilities?: AgentCapability[];
          accepted_task_types?: AgentTaskType[];
          handoff_targets?: string[];
          output_schema?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          description?: string;
          status?: AgentStatus;
          priority_level?: AgentPriorityLevel;
          capabilities?: AgentCapability[];
          accepted_task_types?: AgentTaskType[];
          handoff_targets?: string[];
          output_schema?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_tasks: {
        Row: {
          id: string;
          agent_id: string;
          profile_id: string | null;
          requested_by: string | null;
          task_type: AgentTaskType;
          priority: AgentTaskPriority;
          status: AgentTaskStatus;
          input_payload: Json | null;
          output_schema: Json | null;
          next_step: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          profile_id?: string | null;
          requested_by?: string | null;
          task_type: AgentTaskType;
          priority?: AgentTaskPriority;
          status?: AgentTaskStatus;
          input_payload?: Json | null;
          output_schema?: Json | null;
          next_step: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          profile_id?: string | null;
          requested_by?: string | null;
          task_type?: AgentTaskType;
          priority?: AgentTaskPriority;
          status?: AgentTaskStatus;
          input_payload?: Json | null;
          output_schema?: Json | null;
          next_step?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generation_jobs: {
        Row: {
          id: string;
          agent_task_id: string;
          kind: GenerationKind;
          status: GenerationStatus;
          prompt: string;
          model_target: string | null;
          external_job_id: string | null;
          settings: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_task_id: string;
          kind: GenerationKind;
          status?: GenerationStatus;
          prompt: string;
          model_target?: string | null;
          external_job_id?: string | null;
          settings?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_task_id?: string;
          kind?: GenerationKind;
          status?: GenerationStatus;
          prompt?: string;
          model_target?: string | null;
          external_job_id?: string | null;
          settings?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          id: string;
          generation_job_id: string | null;
          owner_profile_id: string | null;
          title: string;
          kind: GenerationKind;
          status: MediaAssetStatus;
          storage_bucket: string;
          storage_path: string | null;
          public_url: string | null;
          preview_url: string | null;
          mime_type: string | null;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          generation_job_id?: string | null;
          owner_profile_id?: string | null;
          title: string;
          kind: GenerationKind;
          status?: MediaAssetStatus;
          storage_bucket?: string;
          storage_path?: string | null;
          public_url?: string | null;
          preview_url?: string | null;
          mime_type?: string | null;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          generation_job_id?: string | null;
          owner_profile_id?: string | null;
          title?: string;
          kind?: GenerationKind;
          status?: MediaAssetStatus;
          storage_bucket?: string;
          storage_path?: string | null;
          public_url?: string | null;
          preview_url?: string | null;
          mime_type?: string | null;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          owner_profile_id: string | null;
          title: string;
          objective: string;
          brief: string | null;
          status: CampaignStatus;
          channels: string[];
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id?: string | null;
          title: string;
          objective: string;
          brief?: string | null;
          status?: CampaignStatus;
          channels?: string[];
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_profile_id?: string | null;
          title?: string;
          objective?: string;
          brief?: string | null;
          status?: CampaignStatus;
          channels?: string[];
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_assets: {
        Row: {
          id: string;
          campaign_id: string;
          media_asset_id: string;
          role: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          media_asset_id: string;
          role?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          media_asset_id?: string;
          role?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      promotion_packages: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          status: PromotionStatus;
          channels: string[];
          package_payload: Json | null;
          prepared_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          status?: PromotionStatus;
          channels?: string[];
          package_payload?: Json | null;
          prepared_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          status?: PromotionStatus;
          channels?: string[];
          package_payload?: Json | null;
          prepared_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      download_events: {
        Row: {
          id: string;
          media_asset_id: string;
          profile_id: string | null;
          source: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_asset_id: string;
          profile_id?: string | null;
          source?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          media_asset_id?: string;
          profile_id?: string | null;
          source?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          profile_id: string | null;
          agent_task_id: string | null;
          generation_job_id: string | null;
          media_asset_id: string | null;
          module: ModuleKey;
          event_type: string;
          severity: ActivitySeverity;
          message: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          agent_task_id?: string | null;
          generation_job_id?: string | null;
          media_asset_id?: string | null;
          module: ModuleKey;
          event_type: string;
          severity?: ActivitySeverity;
          message: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          agent_task_id?: string | null;
          generation_job_id?: string | null;
          media_asset_id?: string | null;
          module?: ModuleKey;
          event_type?: string;
          severity?: ActivitySeverity;
          message?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ProfileRecord = Database["public"]["Tables"]["profiles"]["Row"];
export type AgentRecord = Database["public"]["Tables"]["agents"]["Row"];
export type AgentTaskRecord = Database["public"]["Tables"]["agent_tasks"]["Row"];
export type GenerationJobRecord = Database["public"]["Tables"]["generation_jobs"]["Row"];
export type MediaAssetRecord = Database["public"]["Tables"]["media_assets"]["Row"];
export type CampaignRecord = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignAssetRecord = Database["public"]["Tables"]["campaign_assets"]["Row"];
export type PromotionPackageRecord = Database["public"]["Tables"]["promotion_packages"]["Row"];
export type DownloadEventRecord = Database["public"]["Tables"]["download_events"]["Row"];
export type ActivityEventRecord = Database["public"]["Tables"]["activity_events"]["Row"];
