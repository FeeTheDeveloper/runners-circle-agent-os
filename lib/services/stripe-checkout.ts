import "server-only";

import type Stripe from "stripe";
import { getPlanFeature, planFeatures, planTierOrder } from "@/lib/billing/plans";
import { getStripeClient, getStripeClientReadiness } from "@/lib/stripe/client";
import {
  findBillingAccountByStripeReference,
  getBillingAccountAsync,
  syncPlanEntitlements,
  upsertBillingAccountRecord,
} from "@/lib/services/billing";
import { getPublicSiteUrl } from "@/lib/supabase/env";
import { syncUsageBalanceToPlan } from "@/lib/services/usage";
import type { BillingAccount, BillingStatus, PlanTier } from "@/lib/types/billing";
import type { StripeBillingInterval, StripeCheckoutInput, StripePortalInput, StripeSyncResult } from "@/lib/types/stripe";

export interface StripeCustomerResult {
  mode: "mock" | "live";
  customerId: string | null;
  billingAccount: BillingAccount;
  created: boolean;
}

export interface StripeCheckoutSessionResult {
  success: boolean;
  mode: "mock" | "live";
  url: string | null;
  sessionId: string | null;
  customerId: string | null;
  priceId: string | null;
  message: string;
}

export interface StripePortalSessionResult {
  success: boolean;
  mode: "mock" | "live";
  url: string | null;
  customerId: string | null;
  message: string;
}

const planTierSet = new Set<PlanTier>(planTierOrder);
const stripeManagedPlanTiers: PlanTier[] = ["creator", "pro", "agency"];

function nowIso() {
  return new Date().toISOString();
}

function nextResetAt(base = new Date()) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString();
}

function normalizeTeamId(teamId?: string | null) {
  return teamId?.trim() || null;
}

function isPlanTier(value: string | null | undefined): value is PlanTier {
  return Boolean(value && planTierSet.has(value as PlanTier));
}

function normalizeMetadataValue(value: string | null | undefined) {
  return value?.trim() || "";
}

function getMetadataValue(metadata: Stripe.Metadata | Record<string, string> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPlanTierFromMetadata(metadata: Stripe.Metadata | Record<string, string> | null | undefined) {
  const planTier = getMetadataValue(metadata, "planTier");
  return isPlanTier(planTier) ? planTier : null;
}

function getTeamIdFromMetadata(metadata: Stripe.Metadata | Record<string, string> | null | undefined) {
  const teamId = getMetadataValue(metadata, "teamId");
  return teamId === "personal" ? null : teamId;
}

function toMetadata(input: {
  userId: string;
  teamId?: string | null;
  planTier?: PlanTier | null;
  interval?: StripeBillingInterval | null;
  priceId?: string | null;
}) {
  return {
    userId: normalizeMetadataValue(input.userId),
    teamId: normalizeMetadataValue(input.teamId ?? "personal"),
    planTier: normalizeMetadataValue(input.planTier ?? ""),
    interval: normalizeMetadataValue(input.interval ?? ""),
    priceId: normalizeMetadataValue(input.priceId ?? ""),
  };
}

function appendQuery(url: string, key: string, value: string) {
  const resolvedUrl = new URL(url, getPublicSiteUrl());
  resolvedUrl.searchParams.set(key, value);
  return resolvedUrl.toString();
}

function buildDefaultCheckoutSuccessUrl(teamId?: string | null) {
  let url = appendQuery(`${getPublicSiteUrl()}/billing`, "checkout", "success");
  url = appendQuery(url, "session_id", "{CHECKOUT_SESSION_ID}");

  if (teamId) {
    url = appendQuery(url, "teamId", teamId);
  }

  return url;
}

function buildDefaultCheckoutCancelUrl(teamId?: string | null) {
  let url = appendQuery(`${getPublicSiteUrl()}/billing`, "checkout", "cancelled");

  if (teamId) {
    url = appendQuery(url, "teamId", teamId);
  }

  return url;
}

function buildDefaultPortalReturnUrl(teamId?: string | null) {
  let url = appendQuery(`${getPublicSiteUrl()}/billing`, "portal", "return");

  if (teamId) {
    url = appendQuery(url, "teamId", teamId);
  }

  return url;
}

function buildMockBillingUrl(input: {
  mode: "checkout" | "portal";
  teamId?: string | null;
  planTier?: PlanTier;
  interval?: StripeBillingInterval;
}) {
  let url = appendQuery(`${getPublicSiteUrl()}/billing`, input.mode, "mock");

  if (input.planTier) {
    url = appendQuery(url, "plan", input.planTier);
  }

  if (input.interval) {
    url = appendQuery(url, "interval", input.interval);
  }

  if (input.teamId) {
    url = appendQuery(url, "teamId", input.teamId);
  }

  return url;
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "canceled":
      return "cancelled";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "past_due";
  }
}

function extractStringId(value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function extractPriceId(value: string | Stripe.Price | Stripe.DeletedPrice | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function getPlanTierFromPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  const match = stripeManagedPlanTiers.find((planTier) => {
    const plan = planFeatures[planTier];
    return plan.stripeMonthlyPriceId === priceId || plan.stripeYearlyPriceId === priceId;
  });

  return match ?? null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price.id ?? null;
}

function getInvoicePriceId(invoice: Stripe.Invoice) {
  const line = invoice.lines.data.find((item) => item.pricing?.type === "price_details") ?? invoice.lines.data[0];

  if (!line) {
    return null;
  }

  if (line.pricing?.type === "price_details") {
    return extractPriceId(line.pricing.price_details?.price);
  }

  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;

  return typeof parentSubscription === "string" ? parentSubscription : parentSubscription?.id ?? null;
}

function buildBillingMetadata(input: {
  base: BillingAccount["metadata"];
  customerId?: string | null;
  subscriptionId?: string | null;
  planTier?: PlanTier | null;
  interval?: StripeBillingInterval | null;
  priceId?: string | null;
  lastEventType?: string | null;
  lastCheckoutSessionId?: string | null;
}) {
  return {
    ...input.base,
    demoMode: false,
    billingOrigin: "stripe",
    stripeCustomerId: input.customerId ?? null,
    stripeSubscriptionId: input.subscriptionId ?? null,
    stripePlanTier: input.planTier ?? null,
    stripeBillingInterval: input.interval ?? null,
    stripePriceId: input.priceId ?? null,
    lastStripeWebhookEventType: input.lastEventType ?? null,
    lastStripeCheckoutSessionId: input.lastCheckoutSessionId ?? null,
    syncedAt: nowIso(),
  };
}

export function mapPlanToStripePrice(planTier: PlanTier, interval: StripeBillingInterval) {
  const plan = getPlanFeature(planTier);

  if (plan.planTier === "enterprise" || plan.planTier === "free") {
    return null;
  }

  return interval === "yearly" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
}

export async function getOrCreateStripeCustomer(input: Pick<StripeCheckoutInput, "userId" | "email" | "teamId">) {
  const billingAccount = await getBillingAccountAsync(input.userId, input.teamId ?? null);
  const stripe = getStripeClient();
  const readiness = getStripeClientReadiness();

  if (!stripe || !readiness.configured) {
    return {
      mode: "mock",
      customerId: billingAccount.stripeCustomerId,
      billingAccount,
      created: false,
    } satisfies StripeCustomerResult;
  }

  if (billingAccount.stripeCustomerId) {
    if (billingAccount.provider !== "stripe") {
      const updatedAccount = await upsertBillingAccountRecord({
        userId: billingAccount.userId,
        teamId: billingAccount.teamId,
        planTier: billingAccount.planTier,
        billingStatus: billingAccount.billingStatus,
        provider: "stripe",
        metadata: buildBillingMetadata({
          base: billingAccount.metadata,
          customerId: billingAccount.stripeCustomerId,
          subscriptionId: billingAccount.stripeSubscriptionId,
        }),
        stripeCustomerId: billingAccount.stripeCustomerId,
        stripeSubscriptionId: billingAccount.stripeSubscriptionId,
        resetAt: billingAccount.resetAt,
      });

      return {
        mode: "live",
        customerId: updatedAccount.stripeCustomerId,
        billingAccount: updatedAccount,
        created: false,
      } satisfies StripeCustomerResult;
    }

    return {
      mode: "live",
      customerId: billingAccount.stripeCustomerId,
      billingAccount,
      created: false,
    } satisfies StripeCustomerResult;
  }

  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    metadata: toMetadata({
      userId: input.userId,
      teamId: normalizeTeamId(input.teamId),
    }),
  });

  const updatedAccount = await upsertBillingAccountRecord({
    userId: billingAccount.userId,
    teamId: billingAccount.teamId,
    planTier: billingAccount.planTier,
    billingStatus: billingAccount.billingStatus,
    provider: "stripe",
    metadata: buildBillingMetadata({
      base: billingAccount.metadata,
      customerId: customer.id,
      subscriptionId: billingAccount.stripeSubscriptionId,
    }),
    stripeCustomerId: customer.id,
    stripeSubscriptionId: billingAccount.stripeSubscriptionId,
    resetAt: billingAccount.resetAt,
  });

  return {
    mode: "live",
    customerId: customer.id,
    billingAccount: updatedAccount,
    created: true,
  } satisfies StripeCustomerResult;
}

export async function createCheckoutSession(input: StripeCheckoutInput): Promise<StripeCheckoutSessionResult> {
  await syncPlanEntitlements();

  if (input.planTier === "enterprise") {
    return {
      success: true,
      mode: "mock",
      url: buildMockBillingUrl({
        mode: "checkout",
        teamId: input.teamId,
        planTier: input.planTier,
        interval: input.interval,
      }),
      sessionId: null,
      customerId: null,
      priceId: null,
      message: "Enterprise billing stays sales-assisted until a custom contract flow is connected.",
    };
  }

  const priceId = mapPlanToStripePrice(input.planTier, input.interval);

  if (!priceId) {
    return {
      success: false,
      mode: getStripeClientReadiness().mode,
      url: null,
      sessionId: null,
      customerId: null,
      priceId: null,
      message: `No Stripe price id is configured for the ${input.planTier} ${input.interval} plan.`,
    };
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return {
      success: true,
      mode: "mock",
      url: buildMockBillingUrl({
        mode: "checkout",
        teamId: input.teamId,
        planTier: input.planTier,
        interval: input.interval,
      }),
      sessionId: null,
      customerId: null,
      priceId,
      message: "Stripe is not configured, so checkout stays in mock-safe mode.",
    };
  }

  const customer = await getOrCreateStripeCustomer(input);
  const successUrl = input.successUrl ?? buildDefaultCheckoutSuccessUrl(input.teamId);
  const cancelUrl = input.cancelUrl ?? buildDefaultCheckoutCancelUrl(input.teamId);
  const metadata = toMetadata({
    userId: input.userId,
    teamId: normalizeTeamId(input.teamId),
    planTier: input.planTier,
    interval: input.interval,
    priceId,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.customerId ?? undefined,
    client_reference_id: normalizeTeamId(input.teamId) ? `team:${normalizeTeamId(input.teamId)}` : `user:${input.userId}`,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
  });

  return {
    success: true,
    mode: "live",
    url: session.url ?? successUrl,
    sessionId: session.id,
    customerId: customer.customerId,
    priceId,
    message: "Stripe Checkout session created.",
  };
}

export async function createCustomerPortalSession(input: StripePortalInput): Promise<StripePortalSessionResult> {
  const billingAccount = await getBillingAccountAsync(input.userId, input.teamId ?? null);
  const stripe = getStripeClient();

  if (!stripe) {
    return {
      success: true,
      mode: "mock",
      url: buildMockBillingUrl({
        mode: "portal",
        teamId: input.teamId,
      }),
      customerId: billingAccount.stripeCustomerId,
      message: "Stripe is not configured, so the billing portal stays in mock-safe mode.",
    };
  }

  if (!billingAccount.stripeCustomerId) {
    return {
      success: false,
      mode: "live",
      url: null,
      customerId: null,
      message: "No Stripe customer record exists yet for this billing scope.",
    };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billingAccount.stripeCustomerId,
    return_url: input.returnUrl ?? buildDefaultPortalReturnUrl(input.teamId),
  });

  return {
    success: true,
    mode: "live",
    url: session.url,
    customerId: billingAccount.stripeCustomerId,
    message: "Stripe Customer Portal session created.",
  };
}

async function syncStripeAccountState(input: {
  userId: string | null;
  teamId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  planTier?: PlanTier | null;
  billingStatus: BillingStatus;
  interval?: StripeBillingInterval | null;
  priceId?: string | null;
  eventType: string;
  sessionId?: string | null;
  resetAt?: string | null;
}) {
  const referenceAccount =
    (input.customerId || input.subscriptionId
      ? await findBillingAccountByStripeReference({
          stripeCustomerId: input.customerId,
          stripeSubscriptionId: input.subscriptionId,
        })
      : null) ?? null;

  const userId = input.userId ?? referenceAccount?.userId ?? null;

  if (!userId) {
    return {
      success: false,
      mode: "live",
      eventType: input.eventType as StripeSyncResult["eventType"],
      billingAccountId: referenceAccount?.id ?? null,
      customerId: input.customerId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      planTier: input.planTier ?? referenceAccount?.planTier ?? null,
      message: "Stripe event was received, but no internal user mapping was available for sync.",
    } satisfies StripeSyncResult;
  }

  const teamId = normalizeTeamId(input.teamId ?? referenceAccount?.teamId ?? null);
  const planTier = input.planTier ?? referenceAccount?.planTier ?? "free";
  const existingAccount = referenceAccount ?? (await getBillingAccountAsync(userId, teamId));
  const billingAccount = await upsertBillingAccountRecord({
    userId,
    teamId,
    planTier,
    billingStatus: input.billingStatus,
    provider: "stripe",
    metadata: buildBillingMetadata({
      base: existingAccount.metadata,
      customerId: input.customerId ?? existingAccount.stripeCustomerId,
      subscriptionId: input.subscriptionId ?? existingAccount.stripeSubscriptionId,
      planTier,
      interval: input.interval ?? null,
      priceId: input.priceId ?? null,
      lastEventType: input.eventType,
      lastCheckoutSessionId: input.sessionId ?? null,
    }),
    stripeCustomerId: input.customerId ?? existingAccount.stripeCustomerId,
    stripeSubscriptionId: input.subscriptionId ?? existingAccount.stripeSubscriptionId,
    resetAt: input.resetAt ?? existingAccount.resetAt,
  });

  await syncUsageBalanceToPlan({
    userId,
    teamId,
    planTier,
    resetAt: input.resetAt ?? billingAccount.resetAt,
  });

  return {
    success: true,
    mode: "live",
    eventType: input.eventType as StripeSyncResult["eventType"],
    billingAccountId: billingAccount.id,
    customerId: billingAccount.stripeCustomerId,
    subscriptionId: billingAccount.stripeSubscriptionId,
    planTier: billingAccount.planTier,
    message: `Stripe billing state synced for the ${billingAccount.planTier} plan.`,
  } satisfies StripeSyncResult;
}

export async function syncStripeWebhookEvent(event: Stripe.Event): Promise<StripeSyncResult> {
  await syncPlanEntitlements();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = extractStringId(session.customer);
      const subscriptionId = extractStringId(session.subscription);
      const userId = getMetadataValue(session.metadata, "userId");
      const teamId = getTeamIdFromMetadata(session.metadata);
      const intervalValue = getMetadataValue(session.metadata, "interval");
      const interval = intervalValue === "monthly" || intervalValue === "yearly" ? intervalValue : null;
      const priceId = getMetadataValue(session.metadata, "priceId");
      const planTier = getPlanTierFromMetadata(session.metadata) ?? getPlanTierFromPriceId(priceId);

      return syncStripeAccountState({
        userId,
        teamId,
        customerId,
        subscriptionId,
        planTier,
        billingStatus: "active",
        interval,
        priceId,
        eventType: event.type,
        sessionId: session.id,
        resetAt: nextResetAt(),
      });
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = extractStringId(subscription.customer);
      const priceId = getSubscriptionPriceId(subscription);
      const derivedPlanTier = getPlanTierFromMetadata(subscription.metadata) ?? getPlanTierFromPriceId(priceId);
      const userId = getMetadataValue(subscription.metadata, "userId");
      const teamId = getTeamIdFromMetadata(subscription.metadata);
      const intervalValue = getMetadataValue(subscription.metadata, "interval");
      const interval = intervalValue === "monthly" || intervalValue === "yearly" ? intervalValue : null;
      const planTier = event.type === "customer.subscription.deleted" ? "free" : derivedPlanTier;
      const billingStatus = event.type === "customer.subscription.deleted" ? "cancelled" : mapSubscriptionStatus(subscription.status);

      return syncStripeAccountState({
        userId,
        teamId,
        customerId,
        subscriptionId: subscription.id,
        planTier,
        billingStatus,
        interval,
        priceId,
        eventType: event.type,
        resetAt: nextResetAt(),
      });
    }

    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = extractStringId(invoice.customer);
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      const priceId = getInvoicePriceId(invoice);
      const billingAccount =
        (customerId || subscriptionId
          ? await findBillingAccountByStripeReference({
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            })
          : null) ?? null;
      const userId = getMetadataValue(invoice.parent?.subscription_details?.metadata, "userId") ?? billingAccount?.userId ?? null;
      const teamId = getTeamIdFromMetadata(invoice.parent?.subscription_details?.metadata) ?? billingAccount?.teamId ?? null;
      const planTier =
        getPlanTierFromMetadata(invoice.parent?.subscription_details?.metadata) ??
        getPlanTierFromPriceId(priceId) ??
        billingAccount?.planTier ??
        null;
      const billingStatus = event.type === "invoice.payment_failed" ? "past_due" : "active";

      return syncStripeAccountState({
        userId,
        teamId,
        customerId,
        subscriptionId,
        planTier,
        billingStatus,
        priceId,
        eventType: event.type,
        resetAt: event.type === "invoice.payment_succeeded" ? nextResetAt() : billingAccount?.resetAt ?? null,
      });
    }

    default:
      return {
        success: true,
        mode: "live",
        eventType: null,
        billingAccountId: null,
        customerId: null,
        subscriptionId: null,
        planTier: null,
        message: `Stripe event ${event.type} does not change billing state in this app.`,
      };
  }
}
