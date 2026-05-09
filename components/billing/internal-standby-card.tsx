interface InternalStandbyCardProps {
  compact?: boolean;
}

export function InternalStandbyCard({ compact = false }: InternalStandbyCardProps) {
  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Billing Standby</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Billing architecture is preserved, but internal mode keeps it inactive.
          </h2>
        </div>
        <div className="status-pill border-electric/20 bg-electric/10 text-electric">Internal standby</div>
      </div>

      <p className={`text-sm leading-7 text-muted ${compact ? "mt-4" : "mt-5"}`}>
        Stripe stays installed for future reactivation while plan enforcement, upgrade prompts, and subscription pressure
        remain bypassed for private operator use.
      </p>

      {!compact ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Usage mode</p>
            <p className="mt-2 text-lg font-semibold text-foreground">Unlimited internal</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Checkout</p>
            <p className="mt-2 text-lg font-semibold text-foreground">Installed, inactive</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Audit trail</p>
            <p className="mt-2 text-lg font-semibold text-foreground">Preserved</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
