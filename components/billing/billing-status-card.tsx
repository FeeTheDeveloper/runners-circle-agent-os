"use client";

import { useState } from "react";
import type { BillingAccount, BillingReadiness } from "@/lib/types/billing";

interface BillingStatusCardProps {
  account: BillingAccount;
  readiness: BillingReadiness;
  warningCount?: number;
  teamId?: string | null;
}

interface StripePortalResponse {
  success: boolean;
  data?: {
    portal: {
      url: string | null;
    };
  };
  error?: {
    message: string;
  };
}

function getStripeBadge(readiness: BillingReadiness) {
  if (readiness.checkoutConnected && readiness.portalConfigured && readiness.webhookConfigured) {
    return {
      label: "Stripe live",
      className: "status-pill border-electric/20 bg-electric/10 text-electric",
    };
  }

  if (readiness.stripeConfigured) {
    return {
      label: "Stripe partial",
      className: "status-pill border-orange/20 bg-orange/10 text-orange-soft",
    };
  }

  return {
    label: "Stripe missing",
    className: "status-pill border-warning/30 bg-warning/10 text-warning",
  };
}

export function BillingStatusCard({ account, readiness, warningCount = 0, teamId = null }: BillingStatusCardProps) {
  const [isManaging, setIsManaging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const stripeBadge = getStripeBadge(readiness);
  const portalDisabled = !readiness.portalConfigured || !account.stripeCustomerId;

  async function handleManageBilling() {
    setIsManaging(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
        }),
      });
      const body = (await response.json()) as StripePortalResponse;

      if (!response.ok || !body.success || !body.data?.portal.url) {
        setFeedback(body.error?.message ?? "Unable to open the Stripe billing portal.");
        return;
      }

      window.location.assign(body.data.portal.url);
    } catch {
      setFeedback("Unable to reach the billing portal right now.");
    } finally {
      setIsManaging(false);
    }
  }

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Billing Status</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Plan and provider readiness</h2>
        </div>
        <div className={stripeBadge.className}>{stripeBadge.label}</div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Current plan</p>
          <p className="mt-2 text-lg font-semibold capitalize text-foreground">{account.planTier}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Billing state</p>
          <p className="mt-2 text-lg font-semibold capitalize text-foreground">{account.billingStatus.replaceAll("_", " ")}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Usage tracking</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{readiness.usageTrackingReady ? "Ready" : "Pending"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Active warnings</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{warningCount}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Portal</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{readiness.portalConfigured ? "Configured" : "Waiting on Stripe env"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Webhook sync</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{readiness.webhookConfigured ? "Configured" : "Signature secret missing"}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleManageBilling}
          disabled={portalDisabled || isManaging}
          className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isManaging ? "Opening..." : "Manage Billing"}
        </button>
        <span className="text-sm text-muted">
          {account.stripeCustomerId
            ? "Existing Stripe customers can manage subscriptions and payment methods here."
            : "A Stripe customer record appears after the first live checkout completes."}
        </span>
      </div>

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{feedback}</div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Readiness notes</p>
        <div className="mt-3 space-y-2">
          {readiness.notes.map((note) => (
            <p key={note} className="text-sm leading-6 text-muted">
              {note}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
