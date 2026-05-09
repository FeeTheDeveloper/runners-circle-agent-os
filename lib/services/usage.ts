import { isInternalOperatorModeEnabled } from "@/lib/config/internal-mode";
import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";
import { getNextPlanTier, getPlanFeature } from "@/lib/billing/plans";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/env";
import { getBillingAccount, getBillingAccountAsync } from "@/lib/services/billing";
import type {
  ConsumeUsageCreditInput,
  PlanFeature,
  PlanTier,
  RecordUsageEventInput,
  UsageCheckInput,
  UsageCheckResult,
  UsageCreditBalance,
  UsageEvent,
  UsageEventType,
  UsageRemaining,
  UsageSnapshot,
} from "@/lib/types/billing";
import type { UsageCreditBalanceRow } from "@/lib/types/database";

const usageBalancesStore: UsageCreditBalance[] = [];
const usageEventsStore: UsageEvent[] = [];
const uuidLikePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nowIso() {
  return new Date().toISOString();
}

function nextResetAt(base = new Date()) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString();
}

function resolveTeamId(teamId?: string | null) {
  return teamId?.trim() || null;
}

function isUuidLike(value: string | null | undefined) {
  return Boolean(value && uuidLikePattern.test(value));
}

function createUsageBalanceId() {
  return `usage_balance_${crypto.randomUUID().slice(0, 8)}`;
}

function createUsageEventId() {
  return `usage_event_${crypto.randomUUID().slice(0, 8)}`;
}

function isUnlimited(value: number | null) {
  return value === null;
}

function cloneBalance(balance: UsageCreditBalance): UsageCreditBalance {
  return { ...balance };
}

function cloneEvent(event: UsageEvent): UsageEvent {
  return {
    ...event,
    metadata: structuredClone(event.metadata),
  };
}

function supportsPersistentUsage() {
  return !isInternalOperatorModeEnabled() && isSupabaseConfigured() && isServiceRoleConfigured();
}

function mapRowToUsageBalance(row: UsageCreditBalanceRow): UsageCreditBalance {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    planTier: row.plan_tier,
    imageCredits: row.image_credits,
    videoCredits: row.video_credits,
    agentTaskCredits: row.agent_task_credits,
    workflowCredits: row.workflow_credits,
    storageLimitMb: row.storage_limit_mb,
    storageUsedMb: row.storage_used_mb,
    campaignLimit: row.campaign_limit,
    distributionLimit: row.distribution_limit,
    teamSeatLimit: row.team_seat_limit,
    resetAt: row.reset_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncLocalUsageBalance(balance: UsageCreditBalance) {
  const existing = findUsageBalance(balance.userId, balance.teamId);

  if (existing) {
    existing.planTier = balance.planTier;
    existing.imageCredits = balance.imageCredits;
    existing.videoCredits = balance.videoCredits;
    existing.agentTaskCredits = balance.agentTaskCredits;
    existing.workflowCredits = balance.workflowCredits;
    existing.storageLimitMb = balance.storageLimitMb;
    existing.storageUsedMb = balance.storageUsedMb;
    existing.campaignLimit = balance.campaignLimit;
    existing.distributionLimit = balance.distributionLimit;
    existing.teamSeatLimit = balance.teamSeatLimit;
    existing.resetAt = balance.resetAt;
    existing.updatedAt = balance.updatedAt;

    return cloneBalance(existing);
  }

  usageBalancesStore.unshift({ ...balance });
  return cloneBalance(balance);
}

async function maybeGetSupabase() {
  if (!supportsPersistentUsage()) {
    return null;
  }

  return createSupabaseServiceRoleClient();
}

function supportsPersistentIdentity(userId: string, teamId?: string | null) {
  const resolvedTeamId = resolveTeamId(teamId);
  return isUuidLike(userId) && (resolvedTeamId === null || isUuidLike(resolvedTeamId));
}

async function findUsageBalanceRow(userId: string, teamId?: string | null) {
  if (!supportsPersistentIdentity(userId, teamId)) {
    return null;
  }

  const supabase = await maybeGetSupabase();

  if (!supabase) {
    return null;
  }

  let query = supabase.from("usage_credit_balances").select("*").eq("user_id", userId);
  const resolvedTeamId = resolveTeamId(teamId);

  if (resolvedTeamId) {
    query = query.eq("team_id", resolvedTeamId);
  } else {
    query = query.is("team_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UsageCreditBalanceRow;
}

function buildUsageBalance(userId: string, teamId?: string | null): UsageCreditBalance {
  const account = getBillingAccount(userId, teamId);
  const plan = getPlanFeature(account.planTier);
  const timestamp = nowIso();

  return {
    id: createUsageBalanceId(),
    userId: account.userId,
    teamId: account.teamId,
    planTier: account.planTier,
    imageCredits: plan.imageCredits,
    videoCredits: plan.videoCredits,
    agentTaskCredits: plan.agentTaskCredits,
    workflowCredits: plan.workflowCredits,
    storageLimitMb: plan.storageLimitMb,
    storageUsedMb: 0,
    campaignLimit: plan.campaignLimit,
    distributionLimit: plan.distributionLimit,
    teamSeatLimit: plan.teamSeatLimit,
    resetAt: account.resetAt || nextResetAt(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function findUsageBalance(userId: string, teamId?: string | null) {
  const resolvedTeamId = resolveTeamId(teamId);

  return usageBalancesStore.find((balance) => balance.userId === userId && balance.teamId === resolvedTeamId) ?? null;
}

function ensureUsageBalance(userId: string, teamId?: string | null) {
  const existing = findUsageBalance(userId, teamId);

  if (existing) {
    if (Date.parse(existing.resetAt) <= Date.now()) {
      resetMonthlyUsage({ userId, teamId });
      return findUsageBalance(userId, teamId) ?? existing;
    }

    if (isInternalOperatorModeEnabled()) {
      existing.planTier = "enterprise";
      existing.imageCredits = null;
      existing.videoCredits = null;
      existing.agentTaskCredits = null;
      existing.workflowCredits = null;
      existing.storageLimitMb = null;
      existing.campaignLimit = null;
      existing.distributionLimit = null;
      existing.teamSeatLimit = null;
    }

    return existing;
  }

  const balance = buildUsageBalance(userId, teamId);
  usageBalancesStore.unshift(balance);
  return balance;
}

function getUsageResourceInfo(type: UsageEventType) {
  switch (type) {
    case "image_generation":
      return { key: "imageCredits" as const, resource: "Image credits", unit: "credits" };
    case "video_generation":
      return { key: "videoCredits" as const, resource: "Video jobs", unit: "jobs" };
    case "agent_task":
      return { key: "agentTaskCredits" as const, resource: "Agent task credits", unit: "tasks" };
    case "workflow_run":
      return { key: "workflowCredits" as const, resource: "Workflow credits", unit: "runs" };
    case "campaign_created":
      return { key: "campaignLimit" as const, resource: "Campaign allowance", unit: "campaigns" };
    case "distribution_job":
      return { key: "distributionLimit" as const, resource: "Distribution allowance", unit: "jobs" };
    case "storage_upload":
      return { key: "storageLimitMb" as const, resource: "Storage", unit: "MB" };
    case "media_download":
      return null;
  }
}

function getCurrentPlanLimit(plan: PlanFeature, type: UsageEventType) {
  switch (type) {
    case "image_generation":
      return plan.imageCredits;
    case "video_generation":
      return plan.videoCredits;
    case "agent_task":
      return plan.agentTaskCredits;
    case "workflow_run":
      return plan.workflowCredits;
    case "campaign_created":
      return plan.campaignLimit;
    case "distribution_job":
      return plan.distributionLimit;
    case "storage_upload":
      return plan.storageLimitMb;
    case "media_download":
      return null;
  }
}

function buildRemaining(
  balance: UsageCreditBalance,
  type: UsageEventType,
  amount: number,
  plan: PlanFeature,
): UsageRemaining | null {
  const resource = getUsageResourceInfo(type);

  if (!resource) {
    return null;
  }

  if (type === "storage_upload") {
    const predictedUsed = balance.storageUsedMb + amount;
    const limit = balance.storageLimitMb;

    return {
      resource: resource.resource,
      unit: resource.unit,
      used: predictedUsed,
      limit,
      remaining: limit === null ? null : limit - predictedUsed,
    };
  }

  const currentLimit = getCurrentPlanLimit(plan, type);
  const currentRemaining = balance[resource.key];

  if (typeof currentRemaining !== "number" || currentLimit === null) {
    return {
      resource: resource.resource,
      unit: resource.unit,
      used: 0,
      limit: currentLimit,
      remaining: null,
    };
  }

  const remaining = currentRemaining - amount;
  const used = Math.max((currentLimit ?? 0) - remaining, 0);

  return {
    resource: resource.resource,
    unit: resource.unit,
    used,
    limit: currentLimit,
    remaining,
  };
}

function buildWarning(
  type: UsageEventType,
  amount: number,
  remaining: UsageRemaining | null,
  planTier: PlanTier,
) {
  if (!remaining || remaining.limit === null || remaining.remaining === null) {
    return null;
  }

  if (remaining.remaining < 0) {
    return `${remaining.resource} are exhausted on the ${planTier} plan. ${amount} ${remaining.unit} exceeded the current allowance.`;
  }

  const lowThreshold = Math.max(1, Math.ceil(remaining.limit * 0.1));

  if (remaining.remaining <= lowThreshold) {
    return `Only ${remaining.remaining} ${remaining.unit} remain for ${type.replaceAll("_", " ")} on the ${planTier} plan.`;
  }

  return null;
}

export function getPlanEntitlements(planTier: PlanTier) {
  return getPlanFeature(planTier);
}

export function getUsageBalance(userId: string, teamId?: string | null) {
  return cloneBalance(ensureUsageBalance(userId, teamId));
}

export async function getUsageBalanceAsync(userId: string, teamId?: string | null) {
  if (!supportsPersistentIdentity(userId, teamId)) {
    return getUsageBalance(userId, teamId);
  }

  const row = await findUsageBalanceRow(userId, teamId);

  if (row) {
    return syncLocalUsageBalance(mapRowToUsageBalance(row));
  }

  const account = await getBillingAccountAsync(userId, teamId);
  const balance = buildUsageBalance(account.userId, account.teamId);
  const supabase = await maybeGetSupabase();

  if (supabase) {
    const { data } = await supabase
      .from("usage_credit_balances")
      .insert({
        user_id: balance.userId,
        team_id: balance.teamId,
        plan_tier: balance.planTier,
        image_credits: balance.imageCredits,
        video_credits: balance.videoCredits,
        agent_task_credits: balance.agentTaskCredits,
        workflow_credits: balance.workflowCredits,
        storage_limit_mb: balance.storageLimitMb,
        storage_used_mb: balance.storageUsedMb,
        campaign_limit: balance.campaignLimit,
        distribution_limit: balance.distributionLimit,
        team_seat_limit: balance.teamSeatLimit,
        reset_at: balance.resetAt,
        metadata: {},
      })
      .select("*")
      .single();

    if (data) {
      return syncLocalUsageBalance(mapRowToUsageBalance(data as UsageCreditBalanceRow));
    }
  }

  return syncLocalUsageBalance(balance);
}

export function checkUsageLimit(input: UsageCheckInput): UsageCheckResult {
  const amount = input.amount ?? 1;
  const enforcementMode = input.enforcementMode ?? "soft";
  const balance = ensureUsageBalance(input.userId, input.teamId);
  const plan = getPlanFeature(balance.planTier);
  const remaining = buildRemaining(balance, input.type, amount, plan);
  const limitExceeded = remaining !== null && remaining.remaining !== null ? remaining.remaining < 0 : false;
  const allowed = enforcementMode === "soft" ? true : !limitExceeded;
  const warning = buildWarning(input.type, amount, remaining, balance.planTier);

  return {
    allowed,
    softLimited: enforcementMode === "soft" && limitExceeded,
    limitExceeded,
    enforcementMode,
    planTier: balance.planTier,
    type: input.type,
    amount,
    warning,
    upgradeRecommendation: warning ? getNextPlanTier(balance.planTier) : null,
    remaining,
  };
}

export function consumeUsageCredit(input: ConsumeUsageCreditInput) {
  const amount = input.amount ?? 1;
  const balance = ensureUsageBalance(input.userId, input.teamId);
  const timestamp = nowIso();

  switch (input.type) {
    case "image_generation":
      balance.imageCredits = isUnlimited(balance.imageCredits) ? null : Math.max((balance.imageCredits ?? 0) - amount, 0);
      break;
    case "video_generation":
      balance.videoCredits = isUnlimited(balance.videoCredits) ? null : Math.max((balance.videoCredits ?? 0) - amount, 0);
      break;
    case "agent_task":
      balance.agentTaskCredits = isUnlimited(balance.agentTaskCredits) ? null : Math.max((balance.agentTaskCredits ?? 0) - amount, 0);
      break;
    case "workflow_run":
      balance.workflowCredits = isUnlimited(balance.workflowCredits) ? null : Math.max((balance.workflowCredits ?? 0) - amount, 0);
      break;
    case "campaign_created":
      balance.campaignLimit = isUnlimited(balance.campaignLimit) ? null : Math.max((balance.campaignLimit ?? 0) - amount, 0);
      break;
    case "distribution_job":
      balance.distributionLimit = isUnlimited(balance.distributionLimit) ? null : Math.max((balance.distributionLimit ?? 0) - amount, 0);
      break;
    case "storage_upload":
      balance.storageUsedMb += amount;
      break;
    case "media_download":
      break;
  }

  balance.updatedAt = timestamp;
  return cloneBalance(balance);
}

export function recordUsageEvent(input: RecordUsageEventInput) {
  const event: UsageEvent = {
    id: createUsageEventId(),
    userId: input.userId,
    teamId: resolveTeamId(input.teamId),
    type: input.type,
    amount: input.amount ?? 1,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    metadata: structuredClone(input.metadata ?? {}),
    createdAt: nowIso(),
  };

  usageEventsStore.unshift(event);
  return cloneEvent(event);
}

export function resetMonthlyUsage(input: { userId: string; teamId?: string | null }) {
  const teamId = resolveTeamId(input.teamId);
  const balance = findUsageBalance(input.userId, teamId);
  const account = getBillingAccount(input.userId, teamId);
  const plan = getPlanFeature(account.planTier);
  const timestamp = nowIso();

  if (!balance) {
    const created = buildUsageBalance(input.userId, teamId);
    usageBalancesStore.unshift(created);
    return cloneBalance(created);
  }

  balance.planTier = account.planTier;
  balance.imageCredits = plan.imageCredits;
  balance.videoCredits = plan.videoCredits;
  balance.agentTaskCredits = plan.agentTaskCredits;
  balance.workflowCredits = plan.workflowCredits;
  balance.storageLimitMb = plan.storageLimitMb;
  balance.campaignLimit = plan.campaignLimit;
  balance.distributionLimit = plan.distributionLimit;
  balance.teamSeatLimit = plan.teamSeatLimit;
  balance.resetAt = nextResetAt();
  balance.updatedAt = timestamp;

  return cloneBalance(balance);
}

export async function syncUsageBalanceToPlan(input: {
  userId: string;
  teamId?: string | null;
  planTier?: PlanTier;
  resetAt?: string | null;
}) {
  const teamId = resolveTeamId(input.teamId);
  const billingAccount = await getBillingAccountAsync(input.userId, teamId);
  const planTier = input.planTier ?? billingAccount.planTier;
  const plan = getPlanFeature(planTier);
  const current = await getUsageBalanceAsync(input.userId, teamId);
  const timestamp = nowIso();
  const nextBalance: UsageCreditBalance = {
    ...current,
    planTier,
    imageCredits: plan.imageCredits,
    videoCredits: plan.videoCredits,
    agentTaskCredits: plan.agentTaskCredits,
    workflowCredits: plan.workflowCredits,
    storageLimitMb: plan.storageLimitMb,
    campaignLimit: plan.campaignLimit,
    distributionLimit: plan.distributionLimit,
    teamSeatLimit: plan.teamSeatLimit,
    resetAt: input.resetAt ?? billingAccount.resetAt ?? nextResetAt(),
    updatedAt: timestamp,
  };

  if (!supportsPersistentIdentity(input.userId, teamId)) {
    return syncLocalUsageBalance(nextBalance);
  }

  const supabase = await maybeGetSupabase();

  if (supabase) {
    const existing = await findUsageBalanceRow(input.userId, teamId);
    const payload = {
      user_id: nextBalance.userId,
      team_id: nextBalance.teamId,
      plan_tier: nextBalance.planTier,
      image_credits: nextBalance.imageCredits,
      video_credits: nextBalance.videoCredits,
      agent_task_credits: nextBalance.agentTaskCredits,
      workflow_credits: nextBalance.workflowCredits,
      storage_limit_mb: nextBalance.storageLimitMb,
      storage_used_mb: nextBalance.storageUsedMb,
      campaign_limit: nextBalance.campaignLimit,
      distribution_limit: nextBalance.distributionLimit,
      team_seat_limit: nextBalance.teamSeatLimit,
      reset_at: nextBalance.resetAt,
      metadata: {},
    };
    const query = existing
      ? supabase.from("usage_credit_balances").update(payload).eq("id", existing.id)
      : supabase.from("usage_credit_balances").insert(payload);
    const { data } = await query.select("*").single();

    if (data) {
      return syncLocalUsageBalance(mapRowToUsageBalance(data as UsageCreditBalanceRow));
    }
  }

  return syncLocalUsageBalance(nextBalance);
}

export function getUsageEvents(userId: string, teamId?: string | null) {
  const resolvedTeamId = resolveTeamId(teamId);

  return usageEventsStore
    .filter((event) => event.userId === userId && event.teamId === resolvedTeamId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map(cloneEvent);
}

export function getUsageSnapshot(userId: string, teamId?: string | null, seatCount = 1): UsageSnapshot {
  const balance = getUsageBalance(userId, teamId);
  const warnings: string[] = [];
  const recentEvents = getUsageEvents(userId, teamId).slice(0, 8);
  const seatRemaining = balance.teamSeatLimit === null ? null : balance.teamSeatLimit - seatCount;

  if (balance.imageCredits !== null && balance.imageCredits <= 3) {
    warnings.push(`Image credits are low: ${balance.imageCredits} remaining.`);
  }

  if (balance.videoCredits !== null && balance.videoCredits <= 1) {
    warnings.push(`Video jobs are nearly exhausted: ${balance.videoCredits} remaining.`);
  }

  if (balance.workflowCredits !== null && balance.workflowCredits <= 2) {
    warnings.push(`Workflow credits are low: ${balance.workflowCredits} remaining.`);
  }

  if (balance.storageLimitMb !== null) {
    const storageRemaining = balance.storageLimitMb - balance.storageUsedMb;

    if (storageRemaining <= Math.max(100, Math.ceil(balance.storageLimitMb * 0.1))) {
      warnings.push(`Storage is running low: ${storageRemaining} MB remaining.`);
    }
  }

  if (seatRemaining !== null && seatRemaining < 0) {
    warnings.push(`Team seats exceed the ${balance.planTier} plan by ${Math.abs(seatRemaining)}.`);
  }

  return {
    balance,
    seatCount,
    seatRemaining,
    recentEvents,
    warnings,
  };
}

export async function getUsageSnapshotAsync(userId: string, teamId?: string | null, seatCount = 1): Promise<UsageSnapshot> {
  const balance = await getUsageBalanceAsync(userId, teamId);
  const warnings: string[] = [];
  const recentEvents = getUsageEvents(userId, teamId).slice(0, 8);
  const seatRemaining = balance.teamSeatLimit === null ? null : balance.teamSeatLimit - seatCount;

  if (balance.imageCredits !== null && balance.imageCredits <= 3) {
    warnings.push(`Image credits are low: ${balance.imageCredits} remaining.`);
  }

  if (balance.videoCredits !== null && balance.videoCredits <= 1) {
    warnings.push(`Video jobs are nearly exhausted: ${balance.videoCredits} remaining.`);
  }

  if (balance.workflowCredits !== null && balance.workflowCredits <= 2) {
    warnings.push(`Workflow credits are low: ${balance.workflowCredits} remaining.`);
  }

  if (balance.storageLimitMb !== null) {
    const storageRemaining = balance.storageLimitMb - balance.storageUsedMb;

    if (storageRemaining <= Math.max(100, Math.ceil(balance.storageLimitMb * 0.1))) {
      warnings.push(`Storage is running low: ${storageRemaining} MB remaining.`);
    }
  }

  if (seatRemaining !== null && seatRemaining < 0) {
    warnings.push(`Team seats exceed the ${balance.planTier} plan by ${Math.abs(seatRemaining)}.`);
  }

  return {
    balance,
    seatCount,
    seatRemaining,
    recentEvents,
    warnings,
  };
}

// Prime the mock command layer with a team-scoped balance so UI surfaces have consistent demo data.
ensureUsageBalance("mock-user", DEFAULT_MOCK_TEAM_ID);
