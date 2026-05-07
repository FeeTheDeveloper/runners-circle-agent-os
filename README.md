# Runners Circle Agent OS

Runners Circle Agent OS is a clean repository foundation for a future AI media operations platform. This scaffold is intentionally limited to typed routes, shared layout structure, placeholder module surfaces, and Supabase-ready helpers.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Supabase-ready structure
- Vercel deployment target

## Included Routes

- `/`
- `/dashboard`
- `/studio`
- `/studio/image`
- `/studio/video`
- `/agents`
- `/media`
- `/campaigns`
- `/promotions`
- `/operator`
- `/settings`

## First Run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase and OpenAI credentials.
3. Start the app with `npm run dev`.
4. Verify the production build with `npm run build`.

## Environment Variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MEDIA_STORAGE_BUCKET`
- `OPENAI_API_KEY`

## Notes

- No real API calls are wired yet.
- No Prisma, payments, or social publishing are included yet.
- The scaffold deliberately avoids legacy Pages Router patterns and is safe to deploy on Vercel as a foundation.
