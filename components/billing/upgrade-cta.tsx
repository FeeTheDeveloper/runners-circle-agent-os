import type { PlanTier, UpgradeOption } from "@/lib/types/billing";

interface UpgradeCtaProps {
  currentPlanTier: PlanTier;
  options: UpgradeOption[];
  compact?: boolean;
  checkoutConnected?: boolean;
}

export function UpgradeCta({ currentPlanTier, options, compact = false, checkoutConnected = false }: UpgradeCtaProps) {
  if (options.length === 0) {
    return (
      <article className="panel p-5 sm:p-6">
        <p className="eyebrow">Upgrade Path</p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">Enterprise and custom billing stay manual for now.</h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          The current plan is already at the top of the configured ladder. Enterprise remains a contact-sales path even when hosted checkout is ready for the standard tiers.
        </p>
      </article>
    );
  }

  const visibleOptions = compact ? options.slice(0, 2) : options;

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Upgrade Path</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Move beyond the {currentPlanTier} plan when the team is ready.</h2>
        </div>
        <div
          className={
            checkoutConnected
              ? "status-pill border-electric/20 bg-electric/10 text-electric"
              : "status-pill border-warning/30 bg-warning/10 text-warning"
          }
        >
          {checkoutConnected ? "Stripe ready" : "Mock-safe mode"}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted">
        {checkoutConnected
          ? "Use the live checkout controls on each plan card below to open hosted Stripe Checkout. Webhooks remain the source of truth for final plan sync."
          : "Billing logic and usage controls are active, but live checkout stays disabled until Stripe env vars and price ids are configured."}
      </p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {visibleOptions.map((option) => (
          <div key={option.planTier} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-lg font-semibold capitalize text-foreground">{option.planTier}</p>
              <div
                className={
                  option.recommended
                    ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
                    : "status-pill"
                }
              >
                {option.recommended ? "Recommended" : option.supportLevel}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{option.reason}</p>
            <div className="mt-4 space-y-2">
              {option.features.slice(0, 3).map((feature) => (
                <p key={feature} className="text-sm text-foreground/85">
                  {feature}
                </p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-electric">
                {checkoutConnected ? "Live checkout is available on the plan cards below" : "Server-managed upgrade flow stays mock-safe until Stripe is configured"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
