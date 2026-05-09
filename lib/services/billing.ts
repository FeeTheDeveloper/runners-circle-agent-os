import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";
import { getNextPlanTier, getPlanFeature, planFeatures, planTierOrder } from "@/lib/billing/plans";
import { getStripeClientReadiness } from "@/lib/stripe/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  BillingAccount,
  BillingProvider,
  BillingReadiness,
  BillingStatus,
  PlanFeature,
  PlanTier,
  UpgradeOption,
} from "@/lib/types/billing";
import type { BillingAccountRow, Database, Json } from "@/lib/types/database";

interface CreateBillingAccountInput {
  userId: string;
  teamId?: string | null;
  planTier?: PlanTier;
  billingStatus?: BillingStatus;
  provider?: BillingProvider;
  metadata?: Record<string, unknown>;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  resetAt?: string | null;
}

export interface BillingContextSnapshot {
  billingAccount: BillingAccount;
  currentPlan: PlanFeature;
  upgradeOptions: UpgradeOption[];
  billingReadiness: BillingReadiness;
}

const billingAccountsStore: BillingAccount[] = [];
const uuidLikePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type BillingAccountInsert = Database["public"]["Tables"]["billing_accounts"]["Insert"];
type PlanEntitlementInsert = Database["public"]["Tables"]["plan_entitlements"]["Insert"];

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

function createBillingAccountId() {
  return `billing_${crypto.randomUUID().slice(0, 8)}`;
}

function getDefaultPlanTier(teamId: string | null): PlanTier {
  if (teamId === DEFAULT_MOCK_TEAM_ID) {
    return "pro";
  }

  return teamId ? "creator" : "free";
}

function cloneAccount(account: BillingAccount): BillingAccount {
  return {
    ...account,
    metadata: structuredClone(account.metadata),
  };
}

function toJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function findLocalBillingAccount(userId: string, teamId?: string | null) {
  const resolvedTeamId = resolveTeamId(teamId);

  return billingAccountsStore.find((account) => account.userId === userId && account.teamId === resolvedTeamId) ?? null;
}

function mapRowToBillingAccount(row: BillingAccountRow): BillingAccount {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    planTier: row.plan_tier,
    billingStatus: row.billing_status,
    provider: row.provider,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    resetAt: row.reset_at,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncLocalBillingAccount(account: BillingAccount) {
  const existing = findLocalBillingAccount(account.userId, account.teamId);

  if (existing) {
    existing.planTier = account.planTier;
    existing.billingStatus = account.billingStatus;
    existing.provider = account.provider;
    existing.stripeCustomerId = account.stripeCustomerId;
    existing.stripeSubscriptionId = account.stripeSubscriptionId;
    existing.resetAt = account.resetAt;
    existing.metadata = structuredClone(account.metadata);
    existing.updatedAt = account.updatedAt;

    return cloneAccount(existing);
  }

  billingAccountsStore.unshift(cloneAccount(account));
  return cloneAccount(account);
}

function buildBillingAccount(input: CreateBillingAccountInput): BillingAccount {
  const timestamp = nowIso();
  const teamId = resolveTeamId(input.teamId);
  const provider = input.provider ?? "mock";

  return {
    id: createBillingAccountId(),
    userId: input.userId,
    teamId,
    planTier: input.planTier ?? getDefaultPlanTier(teamId),
    billingStatus: input.billingStatus ?? "active",
    provider,
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    resetAt: input.resetAt ?? nextResetAt(),
    metadata: {
      demoMode: provider !== "stripe",
      internalBilling: teamId === DEFAULT_MOCK_TEAM_ID,
      ...(input.metadata ?? {}),
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function supportsPersistentBilling() {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

async function maybeGetSupabase() {
  if (!supportsPersistentBilling()) {
    return null;
  }

  return createSupabaseServiceRoleClient();
}

function supportsPersistentIdentity(userId: string, teamId?: string | null) {
  const resolvedTeamId = resolveTeamId(teamId);
  return isUuidLike(userId) && (resolvedTeamId === null || isUuidLike(resolvedTeamId));
}

async function findBillingAccountRow(
  userId: string,
  teamId?: string | null,
): Promise<BillingAccountRow | null> {
  if (!supportsPersistentIdentity(userId, teamId)) {
    return null;
  }

  const supabase = await maybeGetSupabase();

  if (!supabase) {
    return null;
  }

  let query = supabase.from("billing_accounts").select("*").eq("user_id", userId);
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

  return data as BillingAccountRow;
}

async function findBillingAccountRowByStripeReference(input: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const supabase = await maybeGetSupabase();

  if (!supabase) {
    return null;
  }

  if (input.stripeSubscriptionId) {
    const { data, error } = await supabase
      .from("billing_accounts")
      .select("*")
      .eq("stripe_subscription_id", input.stripeSubscriptionId)
      .maybeSingle();

    if (!error && data) {
      return data as BillingAccountRow;
    }
  }

  if (input.stripeCustomerId) {
    const { data, error } = await supabase
      .from("billing_accounts")
      .select("*")
      .eq("stripe_customer_id", input.stripeCustomerId)
      .maybeSingle();

    if (!error && data) {
      return data as BillingAccountRow;
    }
  }

  return null;
}

function buildPlanEntitlementRows(): PlanEntitlementInsert[] {
  const timestamp = nowIso();

  return planTierOrder.map((planTier) => {
    const plan = getPlanFeature(planTier);

    return {
      id: `plan_entitlement_${planTier}`,
      plan_tier: plan.planTier,
      monthly_price: plan.monthlyPrice,
      yearly_price: plan.yearlyPrice,
      image_credits: plan.imageCredits,
      video_credits: plan.videoCredits,
      agent_task_credits: plan.agentTaskCredits,
      workflow_credits: plan.workflowCredits,
      storage_limit_mb: plan.storageLimitMb,
      campaign_limit: plan.campaignLimit,
      distribution_limit: plan.distributionLimit,
      team_seat_limit: plan.teamSeatLimit,
      support_level: plan.supportLevel,
      features: plan.features,
      metadata: toJson({
        stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
        stripeYearlyPriceId: plan.stripeYearlyPriceId,
      }),
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
}

export async function syncPlanEntitlements() {
  const supabase = await maybeGetSupabase();

  if (!supabase) {
    return Object.values(planFeatures);
  }

  const rows = buildPlanEntitlementRows();
  await supabase.from("plan_entitlements").upsert(rows, { onConflict: "plan_tier" });

  return Object.values(planFeatures);
}

export function createBillingAccount(input: CreateBillingAccountInput) {
  const existing = findLocalBillingAccount(input.userId, input.teamId);

  if (existing) {
    return cloneAccount(existing);
  }

  const account = buildBillingAccount(input);
  billingAccountsStore.unshift(account);
  return cloneAccount(account);
}

export function getBillingAccount(userId: string, teamId?: string | null) {
  return cloneAccount(findLocalBillingAccount(userId, teamId) ?? createBillingAccount({ userId, teamId }));
}

export async function getBillingAccountAsync(userId: string, teamId?: string | null) {
  await syncPlanEntitlements();

  if (!supportsPersistentIdentity(userId, teamId)) {
    return getBillingAccount(userId, teamId);
  }

  const row = await findBillingAccountRow(userId, teamId);

  if (row) {
    return syncLocalBillingAccount(mapRowToBillingAccount(row));
  }

  const account = createBillingAccount({ userId, teamId });
  const supabase = await maybeGetSupabase();

  if (supabase) {
    const payload: BillingAccountInsert = {
      user_id: account.userId,
      team_id: account.teamId,
      plan_tier: account.planTier,
      billing_status: account.billingStatus,
      provider: account.provider,
      stripe_customer_id: account.stripeCustomerId,
      stripe_subscription_id: account.stripeSubscriptionId,
      reset_at: account.resetAt,
      metadata: toJson(account.metadata),
    };

    await supabase.from("billing_accounts").insert(payload);
  }

  return account;
}

export async function upsertBillingAccountRecord(input: CreateBillingAccountInput) {
  const baseAccount = buildBillingAccount(input);

  if (!supportsPersistentIdentity(input.userId, input.teamId)) {
    return syncLocalBillingAccount(baseAccount);
  }

  const supabase = await maybeGetSupabase();

  if (!supabase) {
    return syncLocalBillingAccount(baseAccount);
  }

  await syncPlanEntitlements();
  const existing =
    (await findBillingAccountRow(input.userId, input.teamId)) ??
    (await findBillingAccountRowByStripeReference({
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
    }));

  const payload: BillingAccountInsert = {
    user_id: baseAccount.userId,
    team_id: baseAccount.teamId,
    plan_tier: baseAccount.planTier,
    billing_status: baseAccount.billingStatus,
    provider: baseAccount.provider,
    stripe_customer_id: baseAccount.stripeCustomerId,
    stripe_subscription_id: baseAccount.stripeSubscriptionId,
    reset_at: baseAccount.resetAt,
    metadata: toJson(baseAccount.metadata),
  };

  const query = existing
    ? supabase.from("billing_accounts").update(payload).eq("id", existing.id)
    : supabase.from("billing_accounts").insert(payload);
  const { data, error } = await query.select("*").single();

  if (error || !data) {
    return syncLocalBillingAccount(existing ? { ...baseAccount, id: existing.id } : baseAccount);
  }

  return syncLocalBillingAccount(mapRowToBillingAccount(data as BillingAccountRow));
}

export async function findBillingAccountByStripeReference(input: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const row = await findBillingAccountRowByStripeReference(input);

  if (row) {
    return syncLocalBillingAccount(mapRowToBillingAccount(row));
  }

  const localAccount = billingAccountsStore.find(
    (account) =>
      (input.stripeCustomerId && account.stripeCustomerId === input.stripeCustomerId) ||
      (input.stripeSubscriptionId && account.stripeSubscriptionId === input.stripeSubscriptionId),
  );

  return localAccount ? cloneAccount(localAccount) : null;
}

export function updateBillingStatus(userId: string, teamId: string | null, status: BillingStatus) {
  const account = findLocalBillingAccount(userId, teamId) ?? createBillingAccount({ userId, teamId });
  account.billingStatus = status;
  account.updatedAt = nowIso();
  return cloneAccount(account);
}

export async function updateBillingStatusAsync(userId: string, teamId: string | null, status: BillingStatus) {
  const account = await getBillingAccountAsync(userId, teamId);

  return upsertBillingAccountRecord({
    userId,
    teamId,
    planTier: account.planTier,
    billingStatus: status,
    provider: account.provider,
    metadata: account.metadata,
    stripeCustomerId: account.stripeCustomerId,
    stripeSubscriptionId: account.stripeSubscriptionId,
    resetAt: account.resetAt,
  });
}

export function getCurrentPlan(userId: string, teamId?: string | null): PlanFeature {
  const account = getBillingAccount(userId, teamId);
  return getPlanFeature(account.planTier);
}

export async function getCurrentPlanAsync(userId: string, teamId?: string | null) {
  const account = await getBillingAccountAsync(userId, teamId);
  return getPlanFeature(account.planTier);
}

export function getUpgradeOptions(userId: string, teamId?: string | null): UpgradeOption[] {
  const account = getBillingAccount(userId, teamId);

  return planTierOrder
    .filter((planTier) => planTier !== account.planTier)
    .filter((planTier) => planTierOrder.indexOf(planTier) > planTierOrder.indexOf(account.planTier))
    .map((planTier) => {
      const plan = getPlanFeature(planTier);
      const recommendedPlan = getNextPlanTier(account.planTier);

      return {
        planTier,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        supportLevel: plan.supportLevel,
        features: [...plan.features],
        recommended: recommendedPlan === planTier,
        reason:
          recommendedPlan === planTier
            ? `Best next step after ${account.planTier}.`
            : `Upgrade path from ${account.planTier} for more scale.`,
      };
    });
}

export async function getUpgradeOptionsAsync(userId: string, teamId?: string | null) {
  const account = await getBillingAccountAsync(userId, teamId);

  return planTierOrder
    .filter((planTier) => planTier !== account.planTier)
    .filter((planTier) => planTierOrder.indexOf(planTier) > planTierOrder.indexOf(account.planTier))
    .map((planTier) => {
      const plan = getPlanFeature(planTier);
      const recommendedPlan = getNextPlanTier(account.planTier);

      return {
        planTier,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        supportLevel: plan.supportLevel,
        features: [...plan.features],
        recommended: recommendedPlan === planTier,
        reason:
          recommendedPlan === planTier
            ? `Best next step after ${account.planTier}.`
            : `Upgrade path from ${account.planTier} for more scale.`,
      };
    });
}

export function getBillingReadiness(): BillingReadiness {
  const stripeReadiness = getStripeClientReadiness();
  const livePriceCoverage = (["creator", "pro", "agency"] as const).every((planTier) => {
    const plan = planFeatures[planTier];
    return Boolean(plan.stripeMonthlyPriceId) && Boolean(plan.stripeYearlyPriceId);
  });

  return {
    supabaseReady: isSupabaseConfigured(),
    stripeConfigured: stripeReadiness.configured,
    portalConfigured: stripeReadiness.configured,
    webhookConfigured: stripeReadiness.webhookConfigured,
    checkoutConnected: stripeReadiness.configured && livePriceCoverage,
    usageTrackingReady: true,
    mockFallbackEnabled: true,
    notes: [
      "Billing logic is active in mock and server-managed mode.",
      ...stripeReadiness.notes,
      livePriceCoverage
        ? "Stripe price ids are configured for creator, pro, and agency tiers."
        : "One or more Stripe price ids are still missing, so some live checkout paths stay disabled.",
      "Client surfaces never receive the Stripe secret key.",
    ],
  };
}

export async function getBillingContextSnapshot(userId: string, teamId?: string | null): Promise<BillingContextSnapshot> {
  const billingAccount = await getBillingAccountAsync(userId, teamId);
  const currentPlan = getPlanFeature(billingAccount.planTier);

  return {
    billingAccount,
    currentPlan,
    upgradeOptions: await getUpgradeOptionsAsync(userId, teamId),
    billingReadiness: getBillingReadiness(),
  };
}

// TODO: Replace the service-role Supabase persistence path with a stricter billing-specific repository layer when the production billing backend expands.
