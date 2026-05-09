import { NextResponse } from "next/server";
import { getStripeClient, getStripeServerEnv } from "@/lib/stripe/client";
import { syncStripeWebhookEvent } from "@/lib/services/stripe-checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const env = getStripeServerEnv();

  if (!stripe || !env.webhookSecret) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Stripe webhook handling is not configured on this deployment.",
          code: "STRIPE_NOT_CONFIGURED",
        },
      },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Missing Stripe signature header.",
          code: "MISSING_SIGNATURE",
        },
      },
      { status: 400 },
    );
  }

  try {
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, env.webhookSecret);
    const syncResult = await syncStripeWebhookEvent(event);

    return NextResponse.json({
      success: syncResult.success,
      data: {
        syncResult,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to process the Stripe webhook event.",
          code: "WEBHOOK_PROCESSING_FAILED",
        },
      },
      { status: 400 },
    );
  }
}
