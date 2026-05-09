# Brand Mode Engine

## Current Purpose

The Brand Mode Engine adds a reusable brand intelligence layer across `runners-circle-agent-os` so prompts, generations, campaigns, promotions, and workflow steps can adapt to a defined brand profile.

Current mode is still honest about execution limits:

- agent execution remains manual or assisted
- mock fallback mode remains available
- live social publishing is still not connected

## Brand Profile Structure

Brand profiles are defined in `lib/types/brand.ts`.

`BrandProfile` includes:

- `id`
- `userId`
- `name`
- `slug`
- `description`
- `primaryColor`
- `secondaryColor`
- `accentColor`
- `typographyStyle`
- `visualStyle`
- `motionStyle`
- `tone`
- `tagline`
- `audience`
- `keywords`
- `bannedWords`
- `preferredPlatforms`
- `logoUrl`
- `brandVoiceNotes`
- `callToActionStyle`
- `createdAt`
- `updatedAt`

`BrandModeSettings` controls enforcement behavior:

- `enabled`
- `strictness`
- `injectPromptModifiers`
- `enforceBrandVoice`
- `enforceColorDirection`
- `enforceMotionStyle`

## Prompt Modifier Flow

Prompt enhancement runs through `lib/services/prompt-modifiers.ts` and `lib/services/brand.ts`.

Flow:

1. Start with the user’s base prompt or workflow input.
2. Load the user-scoped brand profile and mode settings.
3. Apply the matching modifier for image, video, campaign, or promotion work.
4. Inject visual, motion, tone, CTA, and platform direction.
5. Filter banned words without replacing the original user intent.
6. Return both the original prompt and the enhanced prompt.

Each modifier returns:

- `originalPrompt`
- `enhancedPrompt`
- `injectedBrandDirection`
- `removedBannedWords`
- `toneAdjustments`
- `brandProfileId`
- `brandModeApplied`

## Brand Mode Enforcement

When Brand Mode is enabled:

- image prompts inherit visual direction, color bias, and composition rules
- video prompts inherit motion direction, pacing cues, and cinematic guidance
- campaign prompts inherit platform priorities and voice constraints
- promotion prompts inherit CTA style and outbound tone rules
- banned words are filtered from prompt and copy output

When Brand Mode is disabled:

- the platform preserves the original prompt or copy
- mock pipelines continue to work without brand enforcement

## Brand-Aware Generation

`lib/services/image-generation.ts` and `lib/services/video-generation.ts` now:

- preserve the original prompt
- create a brand-enhanced prompt when Brand Mode is on
- attach brand metadata to the generation result
- surface validation warnings when output drifts away from the profile

Generation results now include:

- `originalPrompt`
- `enhancedPrompt`
- `brandProfileId`
- `appliedBrandProfile`
- `brandTone`
- `brandModeApplied`
- `brandWarnings`

## Campaign Tone Alignment

`lib/services/campaigns.ts` and `lib/services/promotions.ts` use the brand layer to keep downstream packaging aligned.

Campaign behavior:

- applies brand voice to the core message
- aligns channel ordering with preferred platforms
- carries brand metadata into campaign records
- keeps media-linked records consistent with the active profile

Promotion behavior:

- applies branded CTA style
- shapes caption language around tone and voice notes
- respects preferred platform sequencing
- adds review warnings when brand validation detects drift

## Banned Words System

The banned-word flow is shared across prompt and copy handling.

- banned words are defined on the brand profile
- prompt and copy services remove exact banned-word matches
- validation returns warnings and recommendations when content still looks off-brand
- workflows, campaigns, and promotions all inherit the same rules through shared brand services

## Workflow Integration

Workflow runs inherit brand metadata from the moment a run is created.

- workflow input stores `brandProfileId`, `brandProfileName`, `brandTone`, and `brandModeEnabled`
- generation steps receive brand-aware prompt enhancement
- campaign and promotion steps receive brand-aware voice and prompt handling
- generated media, campaign records, and promotion packages carry the same brand metadata forward

This keeps the execution chain consistent even while agent execution is still manual or assisted.

## Future Multi-Brand Support

The current implementation is user-scoped and mock-persistent. Future upgrades can extend it with:

- Supabase-backed brand profile persistence
- multiple brands per user or workspace
- brand selection per workflow or campaign
- stricter validation thresholds by execution lane
- live brand-aware execution dispatch once a supported ChatGPT Agent API exists

The current contract is designed so those additions can layer in without replacing the existing mock fallback mode.
