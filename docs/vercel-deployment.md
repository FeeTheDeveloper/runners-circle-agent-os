# Local Environment Setup

## Overview

This guide helps you set up your local development environment for runners-circle-agent-os.

## 1. Create .env.local

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

**Never commit `.env.local` to version control.**

## 2. Required Environment Variables

### Supabase Variables (Required)

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key for client-side access
- `SUPABASE_SERVICE_ROLE_KEY`: Private service role key for server-side operations

### Stripe Variables (Required for Billing)

- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_live_` or `sk_test_`)
- `STRIPE_WEBHOOK_SECRET`: Webhook endpoint secret for verifying Stripe events
- `STRIPE_PRICE_CREATOR_MONTHLY`: Stripe Price ID for Creator monthly plan
- `STRIPE_PRICE_CREATOR_YEARLY`: Stripe Price ID for Creator yearly plan
- `STRIPE_PRICE_PRO_MONTHLY`: Stripe Price ID for Pro monthly plan
- `STRIPE_PRICE_PRO_YEARLY`: Stripe Price ID for Pro yearly plan
- `STRIPE_PRICE_AGENCY_MONTHLY`: Stripe Price ID for Agency monthly plan
- `STRIPE_PRICE_AGENCY_YEARLY`: Stripe Price ID for Agency yearly plan

### OpenAI Variable (Required for AI Generation)

- `OPENAI_API_KEY`: Your OpenAI API key (starts with `sk-`)

### Storage Variables (Optional, defaults provided)

- `MEDIA_STORAGE_BUCKET`: Bucket name for media assets (default: `media-assets`)
- `MEDIA_THUMBNAILS_BUCKET`: Bucket name for thumbnails (default: `media-thumbnails`)
- `CAMPAIGN_EXPORTS_BUCKET`: Bucket name for campaign exports (default: `campaign-exports`)
- `MEDIA_STORAGE_PROVIDER`: Storage provider (default: `supabase`)

### Public Variables

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser:

- `NEXT_PUBLIC_SITE_URL`: Your site's public URL
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

All other variables are server-side only and remain private.

## 3. Mock Fallback Behavior

When required environment variables are missing, the application falls back to mock mode:

- **Supabase**: Uses mock data instead of real database operations
- **Stripe**: Checkout and portal links return mock URLs, no real payments
- **OpenAI**: Generation returns mock results instead of real AI calls
- **Storage**: Uses local file system instead of cloud storage

This allows development without full external service setup, but production requires all real credentials.

## 4. Validation

After setting up `.env.local`, run:

```bash
npm run build
```

If the build succeeds, your environment is properly configured.</content>
<parameter name="filePath">c:\Users\uveav\OneDrive\Documents\GitHub\runners-circle-agent-os\docs\local-env-setup.md