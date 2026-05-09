# Stripe Integration

## Required Stripe Setup

Create recurring Stripe Prices for these self-serve plans:

- `creator` monthly
- `creator` yearly
- `pro` monthly
- `pro` yearly
- `agency` monthly
- `agency` yearly

`enterprise` stays outside hosted checkout for now and remains a contact-sales path.

## Environment Variables

Add these server-side values before enabling live billing:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CREATOR_MONTHLY=
STRIPE_PRICE_CREATOR_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_AGENCY_MONTHLY=
STRIPE_PRICE_AGENCY_YEARLY=
```

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must never be exposed to the browser.

## Checkout Flow

1. The billing page calls `POST /api/stripe/checkout`.
2. The route requires an authenticated actor for live mode and checks team billing permissions for team scopes.
3. The server maps the requested plan and interval to a Stripe Price ID.
4. The server creates or reuses a Stripe Customer.
5. The server creates a hosted Stripe Checkout Session and returns the redirect URL.
6. Final plan activation is not trusted until Stripe sends webhook events back to the app.

If Stripe env vars or price ids are missing, the server stays in mock-safe mode and does not pretend a live subscription exists.

## Customer Portal Flow

1. The billing page calls `POST /api/stripe/portal`.
2. The route requires the same auth and team-owner/admin checks for live team billing.
3. The server opens a Stripe Customer Portal Session for the existing Stripe customer record.
4. If no Stripe customer exists yet, the portal action stays unavailable until the first live checkout completes.

## Webhook Events

The webhook route verifies Stripe signatures and handles:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Webhook sync updates:

- `billing_accounts`
- `usage_credit_balances`
- plan entitlements sync state
- billing status

Subscription changes reset the active credit balance to the selected plan while preserving usage history in `usage_events`.

## Local Webhook Testing

Use the Stripe CLI to forward events to the local app:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Then copy the generated signing secret into `STRIPE_WEBHOOK_SECRET`.

## Production Notes

- Deploy the webhook route on a Node runtime.
- Set all Stripe secrets in the server environment only.
- Keep webhook sync as the source of truth for billing status and plan changes.
- Leave mock fallback enabled for demo or internal environments where Stripe is not configured.
- Add live Stripe checkout buttons only for plans with configured price ids.

## Reference Docs

- Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions/create
- Stripe Billing Portal Sessions: https://docs.stripe.com/api/customer_portal/sessions/create
- Stripe webhook signature verification: https://docs.stripe.com/webhooks/signature
