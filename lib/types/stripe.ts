import type { PlanTier } from "@/lib/types/billing";

export const stripeCheckoutModes = ["subscription"] as const;
export type StripeCheckoutMode = (typeof stripeCheckoutModes)[number];

export const stripeBillingIntervals = ["monthly", "yearly"] as const;
export type StripeBillingInterval = (typeof stripeBillingIntervals)[number];

export const stripeWebhookEventTypes = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
] as const;
export type StripeWebhookEventType = (typeof stripeWebhookEventTypes)[number];

export interface StripeCheckoutInput {
  userId: string;
  email: string | null;
  planTier: PlanTier;
  interval: StripeBillingInterval;
  teamId?: string | null;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripePortalInput {
  userId: string;
  teamId?: string | null;
  returnUrl?: string;
}

export interface StripeSyncResult {
  success: boolean;
  mode: "mock" | "live";
  eventType: StripeWebhookEventType | null;
  billingAccountId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  planTier: PlanTier | null;
  message: string;
}
