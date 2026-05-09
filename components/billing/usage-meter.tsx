interface UsageMeterProps {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
  detail?: string;
}

function formatValue(value: number | null, unit: string) {
  if (value === null) {
    return `Unlimited ${unit}`;
  }

  return `${value.toLocaleString()} ${unit}`;
}

export function UsageMeter({ label, used, limit, unit, detail }: UsageMeterProps) {
  const cappedPercent = limit === null || limit <= 0 ? 8 : Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
  const toneClass =
    limit !== null && cappedPercent >= 90
      ? "bg-warning"
      : limit !== null && cappedPercent >= 70
        ? "bg-orange"
        : "bg-electric";

  return (
    <article className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="field-label">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {limit === null ? "Unlimited" : `${Math.max(limit - used, 0).toLocaleString()} left`}
        </p>
      </div>
      <p className="mt-3 text-xl font-semibold text-foreground">
        {used.toLocaleString()} / {formatValue(limit, unit)}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${cappedPercent}%` }} />
      </div>
      {detail ? <p className="mt-3 text-sm leading-6 text-muted">{detail}</p> : null}
    </article>
  );
}
