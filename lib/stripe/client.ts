import "server-only";

import Stripe from "stripe";

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface StripeServerEnv {
  secretKey: string | null;
  webhookSecret: string | null;
}

export interface StripeClientReadiness {
  configured: boolean;
  webhookConfigured: boolean;
  mode: "mock" | "live";
  notes: string[];
}

let stripeClient: Stripe | null | undefined;

export function getStripeServerEnv(): StripeServerEnv {
  return {
    secretKey: normalizeEnvValue(process.env.STRIPE_SECRET_KEY),
    webhookSecret: normalizeEnvValue(process.env.STRIPE_WEBHOOK_SECRET),
  };
}

export function getStripeClientReadiness(): StripeClientReadiness {
  const env = getStripeServerEnv();
  const configured = Boolean(env.secretKey);
  const webhookConfigured = Boolean(env.webhookSecret);

  return {
    configured,
    webhookConfigured,
    mode: configured ? "live" : "mock",
    notes: [
      configured
        ? "Stripe secret key is configured for server-side checkout and portal sessions."
        : "Stripe secret key is missing, so checkout and portal stay in mock-safe mode.",
      webhookConfigured
        ? "Stripe webhook secret is configured for signed event verification."
        : "Stripe webhook secret is missing, so live webhook verification is not active yet.",
    ],
  };
}

export function getStripeClient() {
  const env = getStripeServerEnv();

  if (!env.secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.secretKey, {
      appInfo: {
        name: "runners-circle-agent-os",
        version: "0.1.0",
      },
      maxNetworkRetries: 2,
    });
  }

  return stripeClient;
}
