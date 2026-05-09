export const planTiers = ["free", "creator", "pro", "agency", "enterprise"] as const;
export type PlanTier = (typeof planTiers)[number];

export const billingStatuses = ["trialing", "active", "past_due", "cancelled", "unpaid", "comped"] as const;
export type BillingStatus = (typeof billingStatuses)[number];

export const usageEventTypes = [
  "image_generation",
  "video_generation",
  "agent_task",
  "workflow_run",
  "media_download",
  "storage_upload",
  "distribution_job",
  "campaign_created",
] as const;
export type UsageEventType = (typeof usageEventTypes)[number];

export const usageEnforcementModes = ["soft", "strict"] as const;
export type UsageEnforcementMode = (typeof usageEnforcementModes)[number];

export const billingProviders = ["mock", "internal", "stripe", "stripe_future"] as const;
export type BillingProvider = (typeof billingProviders)[number];

export interface UsageCreditBalance {
  id: string;
  userId: string;
  teamId: string | null;
  planTier: PlanTier;
  imageCredits: number | null;
  videoCredits: number | null;
  agentTaskCredits: number | null;
  workflowCredits: number | null;
  storageLimitMb: number | null;
  storageUsedMb: number;
  campaignLimit: number | null;
  distributionLimit: number | null;
  teamSeatLimit: number | null;
  resetAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  userId: string;
  teamId: string | null;
  type: UsageEventType;
  amount: number;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlanFeature {
  planTier: PlanTier;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  imageCredits: number | null;
  videoCredits: number | null;
  agentTaskCredits: number | null;
  workflowCredits: number | null;
  storageLimitMb: number | null;
  campaignLimit: number | null;
  distributionLimit: number | null;
  teamSeatLimit: number | null;
  supportLevel: string;
  features: string[];
}

export interface BillingAccount {
  id: string;
  userId: string;
  teamId: string | null;
  planTier: PlanTier;
  billingStatus: BillingStatus;
  provider: BillingProvider;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  resetAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeOption {
  planTier: PlanTier;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  supportLevel: string;
  features: string[];
  recommended: boolean;
  reason: string;
}

export interface BillingReadiness {
  supabaseReady: boolean;
  stripeConfigured: boolean;
  portalConfigured: boolean;
  webhookConfigured: boolean;
  checkoutConnected: boolean;
  usageTrackingReady: boolean;
  mockFallbackEnabled: boolean;
  notes: string[];
}

export interface UsageRemaining {
  resource: string;
  unit: string;
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface UsageCheckInput {
  userId: string;
  teamId?: string | null;
  type: UsageEventType;
  amount?: number;
  enforcementMode?: UsageEnforcementMode;
}

export interface UsageCheckResult {
  allowed: boolean;
  softLimited: boolean;
  limitExceeded: boolean;
  enforcementMode: UsageEnforcementMode;
  planTier: PlanTier;
  type: UsageEventType;
  amount: number;
  warning: string | null;
  upgradeRecommendation: PlanTier | null;
  remaining: UsageRemaining | null;
}

export interface ConsumeUsageCreditInput {
  userId: string;
  teamId?: string | null;
  type: UsageEventType;
  amount?: number;
}

export interface RecordUsageEventInput {
  userId: string;
  teamId?: string | null;
  type: UsageEventType;
  amount?: number;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UsageSnapshot {
  balance: UsageCreditBalance;
  seatCount: number;
  seatRemaining: number | null;
  recentEvents: UsageEvent[];
  warnings: string[];
}
