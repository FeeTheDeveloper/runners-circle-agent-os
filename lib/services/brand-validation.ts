import type { BrandProfile, BrandValidationResult } from "@/lib/types/brand";

function normalizeText(value: string) {
  return value.toLowerCase();
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function detectBannedWords(input: { content: string; brandProfile: BrandProfile }) {
  const content = normalizeText(input.content);
  const matches = input.brandProfile.bannedWords.filter((word) => content.includes(word.toLowerCase()));

  return {
    pass: matches.length === 0,
    matches,
    warnings: matches.length > 0 ? [`Blocked language detected: ${matches.join(", ")}.`] : [],
  };
}

export function validateToneAlignment(input: { content: string; brandProfile: BrandProfile }) {
  const tokens = tokenize(input.content);
  const toneSignals = unique([
    input.brandProfile.tone,
    ...input.brandProfile.keywords.flatMap(tokenize),
    ...tokenize(input.brandProfile.brandVoiceNotes),
  ]);
  const matchingSignals = toneSignals.filter((signal) => signal.length > 3 && tokens.includes(signal));
  const score = Math.min(100, matchingSignals.length * 12 + 24);
  const pass = matchingSignals.length >= 2;

  return {
    pass,
    matchingSignals,
    warnings: pass ? [] : ["Tone alignment is soft. Add stronger premium, disciplined, or athletic language cues."],
    recommendations: pass
      ? []
      : [`Lean harder into "${input.brandProfile.tone}" tone and reuse brand keywords like ${input.brandProfile.keywords.slice(0, 3).join(", ")}.`],
    score,
  };
}

export function validateVisualDirection(input: { content: string; brandProfile: BrandProfile }) {
  const content = normalizeText(input.content);
  const cues = unique([
    ...tokenize(input.brandProfile.visualStyle),
    ...tokenize(input.brandProfile.motionStyle),
    ...input.brandProfile.keywords.flatMap(tokenize),
    "orange",
    "electric",
    "charcoal",
    "dark",
    "cinematic",
  ]);
  const matchingCues = cues.filter((cue) => cue.length > 3 && content.includes(cue));
  const pass = matchingCues.length >= 3;

  return {
    pass,
    matchingCues,
    warnings: pass ? [] : ["Visual direction is under-specified for the current brand profile."],
    recommendations: pass
      ? []
      : [
          "Add stronger color, atmosphere, or motion cues from the brand visual system.",
          `Reference the visual direction explicitly: ${input.brandProfile.visualStyle}`,
        ],
    score: Math.min(100, matchingCues.length * 10 + 20),
  };
}

export function scoreBrandConsistency(input: { content: string; brandProfile: BrandProfile }): BrandValidationResult {
  const banned = detectBannedWords(input);
  const tone = validateToneAlignment(input);
  const visual = validateVisualDirection(input);
  const consistencyScore = Math.max(0, Math.min(100, Math.round((tone.score + visual.score) / 2 - banned.matches.length * 20)));
  const warnings = [...banned.warnings, ...tone.warnings, ...visual.warnings];
  const recommendations = [...tone.recommendations, ...visual.recommendations];

  return {
    pass: banned.pass && tone.pass && visual.pass && consistencyScore >= 65,
    warnings,
    recommendations,
    consistencyScore,
  };
}
