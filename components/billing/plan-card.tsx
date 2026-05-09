"use client";

import { useState } from "react";
import { planTierOrder } from "@/lib/billing/plans";
import type { PlanFeature, PlanTier } from "@/lib/types/billing";
import type { StripeBillingInterval } from "@/lib/types/stripe";

interface PlanCardProps {
  plan: PlanFeature;
  currentPlanTier?: PlanTier;
  recommended?: boolean;
  teamId?: string | null;
  checkoutConnected?: boolean;
}

function formatPrice(value: number | null) {
  return value === null ? "Custom" : `$${value}`;
}

function formatQuota(value: number | null, unit: string) {
  return value === null ? `Unlimited ${unit}` : `${value.toLocaleString()} ${unit}`;
}

interface StripeCheckoutResponse {
  success: boolean;
  data?: {
    checkout: {
      url: string | null;
    };
  };
  error?: {
    message: string;
  };
}

function getActionLabel(input: {
  isCurrent: boolean;
  isDowngrade: boolean;
  planTier: PlanTier;
  interval: StripeBillingInterval;
  checkoutConnected: boolean;
  priceConfigured: boolean;
}) {
  if (input.isCurrent) {
    return "Current plan";
  }

  if (input.isDowngrade || input.planTier === "free") {
    return "Downgrade handled manually";
  }

  if (input.planTier === "enterprise") {
    return "Contact sales soon";
  }

  if (!input.checkoutConnected) {
    return "Stripe env required";
  }

  if (!input.priceConfigured) {
    return "Price id missing";
  }

  return input.interval === "monthly" ? "Upgrade monthly" : "Upgrade yearly";
}

export function PlanCard({ plan, currentPlanTier, recommended = false, teamId = null, checkoutConnected = false }: PlanCardProps) {
  const isCurrent = currentPlanTier === plan.planTier;
  const currentPlanIndex = currentPlanTier ? planTierOrder.indexOf(currentPlanTier) : -1;
  const planIndex = planTierOrder.indexOf(plan.planTier);
  const isDowngrade = currentPlanIndex >= 0 && planIndex >= 0 && planIndex < currentPlanIndex;
  const [pendingInterval, setPendingInterval] = useState<StripeBillingInterval | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleCheckout(interval: StripeBillingInterval) {
    setPendingInterval(interval);
    setFeedback(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planTier: plan.planTier,
          interval,
          teamId,
        }),
      });
      const body = (await response.json()) as StripeCheckoutResponse;

      if (!response.ok || !body.success || !body.data?.checkout.url) {
        setFeedback(body.error?.message ?? "Unable to open Stripe Checkout.");
        return;
      }

      window.location.assign(body.data.checkout.url);
    } catch {
      setFeedback("Unable to reach the checkout service right now.");
    } finally {
      setPendingInterval(null);
    }
  }

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Plan Tier</p>
          <h2 className="mt-3 text-2xl font-semibold capitalize text-foreground">{plan.planTier}</h2>
        </div>
        <div
          className={
            isCurrent
              ? "status-pill border-electric/20 bg-electric/10 text-electric"
              : recommended
                ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
                : "status-pill"
          }
        >
          {isCurrent ? "Current" : recommended ? "Recommended" : plan.supportLevel}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Monthly</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatPrice(plan.monthlyPrice)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Yearly</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatPrice(plan.yearlyPrice)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
          Image: <span className="font-semibold text-foreground">{formatQuota(plan.imageCredits, "credits")}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
          Video: <span className="font-semibold text-foreground">{formatQuota(plan.videoCredits, "jobs")}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
          Agent tasks: <span className="font-semibold text-foreground">{formatQuota(plan.agentTaskCredits, "tasks")}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
          Workflows: <span className="font-semibold text-foreground">{formatQuota(plan.workflowCredits, "runs")}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
          Storage: <span className="font-semibold text-foreground">{formatQuota(plan.storageLimitMb, "MB")}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
          Seats: <span className="font-semibold text-foreground">{formatQuota(plan.teamSeatLimit, "seats")}</span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {plan.features.map((feature) => (
          <p key={feature} className="text-sm leading-6 text-muted">
            {feature}
          </p>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(["monthly", "yearly"] as const).map((interval) => {
          const priceConfigured = interval === "monthly" ? Boolean(plan.stripeMonthlyPriceId) : Boolean(plan.stripeYearlyPriceId);
          const disabled =
            isCurrent || isDowngrade || plan.planTier === "free" || plan.planTier === "enterprise" || !checkoutConnected || !priceConfigured;

          return (
            <button
              key={interval}
              type="button"
              onClick={() => handleCheckout(interval)}
              disabled={disabled || pendingInterval !== null}
              className={
                disabled
                  ? "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/70"
                  : "inline-flex items-center justify-center rounded-full bg-orange px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft"
              }
            >
              {pendingInterval === interval
                ? "Opening..."
                : getActionLabel({
                    isCurrent,
                    isDowngrade,
                    planTier: plan.planTier,
                    interval,
                    checkoutConnected,
                    priceConfigured,
                  })}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted">
        {plan.planTier === "enterprise"
          ? "Enterprise remains a sales-assisted plan until a custom contract flow is connected."
          : checkoutConnected
            ? "Hosted Stripe Checkout is available for upgrade paths with configured price ids."
            : "Live checkout is disabled until Stripe env and price ids are configured on the server."}
      </div>

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{feedback}</div>
      ) : null}
    </article>
  );
}
