import type { PlanFeature, PlanTier } from "@/lib/types/billing";

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const planTierOrder: PlanTier[] = ["free", "creator", "pro", "agency", "enterprise"];

export const planFeatures: Record<PlanTier, PlanFeature> = {
  free: {
    planTier: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripeMonthlyPriceId: null,
    stripeYearlyPriceId: null,
    imageCredits: 10,
    videoCredits: 1,
    agentTaskCredits: 25,
    workflowCredits: 3,
    storageLimitMb: 500,
    campaignLimit: 2,
    distributionLimit: 5,
    teamSeatLimit: 1,
    supportLevel: "community",
    features: ["Mock/demo mode", "Brand mode basics", "Manual agent execution"],
  },
  creator: {
    planTier: "creator",
    monthlyPrice: 29,
    yearlyPrice: 290,
    stripeMonthlyPriceId: normalizeEnvValue(process.env.STRIPE_PRICE_CREATOR_MONTHLY),
    stripeYearlyPriceId: normalizeEnvValue(process.env.STRIPE_PRICE_CREATOR_YEARLY),
    imageCredits: 100,
    videoCredits: 10,
    agentTaskCredits: 250,
    workflowCredits: 25,
    storageLimitMb: 10 * 1024,
    campaignLimit: 20,
    distributionLimit: 100,
    teamSeatLimit: 1,
    supportLevel: "standard",
    features: ["Expanded AI credits", "Longer campaign pipeline", "Priority usage insights"],
  },
  pro: {
    planTier: "pro",
    monthlyPrice: 99,
    yearlyPrice: 990,
    stripeMonthlyPriceId: normalizeEnvValue(process.env.STRIPE_PRICE_PRO_MONTHLY),
    stripeYearlyPriceId: normalizeEnvValue(process.env.STRIPE_PRICE_PRO_YEARLY),
    imageCredits: 500,
    videoCredits: 50,
    agentTaskCredits: 1000,
    workflowCredits: 100,
    storageLimitMb: 100 * 1024,
    campaignLimit: 100,
    distributionLimit: 500,
    teamSeatLimit: 3,
    supportLevel: "priority",
    features: ["Team workflows", "Higher storage headroom", "Operator-grade usage oversight"],
  },
  agency: {
    planTier: "agency",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    stripeMonthlyPriceId: normalizeEnvValue(process.env.STRIPE_PRICE_AGENCY_MONTHLY),
    stripeYearlyPriceId: normalizeEnvValue(process.env.STRIPE_PRICE_AGENCY_YEARLY),
    imageCredits: 2000,
    videoCredits: 200,
    agentTaskCredits: 5000,
    workflowCredits: 500,
    storageLimitMb: 1024 * 1024,
    campaignLimit: null,
    distributionLimit: null,
    teamSeatLimit: 15,
    supportLevel: "priority_plus",
    features: ["Unlimited campaigns", "Unlimited distribution jobs", "Multi-operator team headroom"],
  },
  enterprise: {
    planTier: "enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    stripeMonthlyPriceId: null,
    stripeYearlyPriceId: null,
    imageCredits: null,
    videoCredits: null,
    agentTaskCredits: null,
    workflowCredits: null,
    storageLimitMb: null,
    campaignLimit: null,
    distributionLimit: null,
    teamSeatLimit: null,
    supportLevel: "custom",
    features: ["Custom entitlements", "Comped/internal support", "Future direct billing integration"],
  },
};

export function getPlanFeature(planTier: PlanTier) {
  return planFeatures[planTier];
}

export function getNextPlanTier(planTier: PlanTier): PlanTier | null {
  const currentIndex = planTierOrder.indexOf(planTier);

  if (currentIndex < 0 || currentIndex >= planTierOrder.length - 1) {
    return null;
  }

  return planTierOrder[currentIndex + 1] ?? null;
}
