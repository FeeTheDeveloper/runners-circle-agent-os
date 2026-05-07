import clsx from "clsx";
import type { ActivityEvent } from "@/lib/types/activity";

interface ActivityFeedProps {
  items: ActivityEvent[];
  compact?: boolean;
  eyebrow?: string;
  title?: string;
  badge?: string;
}

const severityStyles = {
  info: "border-electric/20 bg-electric/10 text-electric",
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-danger/30 bg-danger/10 text-danger",
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ActivityFeed({
  items,
  compact = false,
  eyebrow = "Activity Feed",
  title = "Operator-visible pipeline activity",
  badge = "Control plane",
}: ActivityFeedProps) {
  return (
    <section className={clsx("panel", compact ? "p-5" : "p-5 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className={clsx("mt-3 font-semibold text-foreground", compact ? "text-xl" : "text-2xl")}>{title}</h2>
        </div>
        <div className="status-pill">{badge}</div>
      </div>

      <div className={clsx(compact ? "mt-5 space-y-2.5" : "mt-6 space-y-3")}>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
            <p className="text-sm text-muted">No activity has been recorded in this view yet.</p>
          </div>
        ) : null}

        {items.map((item) => (
          <article
            key={item.id}
            className={clsx("rounded-2xl border border-white/8 bg-black/20", compact ? "p-3.5" : "p-4")}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={clsx(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  severityStyles[item.severity],
                )}
              >
                {item.severity}
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted">{formatLabel(item.type)}</span>
              <span className="text-xs text-muted">{formatTimestamp(item.createdAt)}</span>
            </div>

            <div className="mt-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
            </div>

            <div className={clsx("flex flex-wrap items-center gap-2 text-xs text-foreground/70", compact ? "mt-3" : "mt-4")}>
              <span className="font-[family-name:var(--font-mono)]">{item.actor}</span>
              <span className="text-muted">/</span>
              <span>{formatLabel(item.relatedEntityType)}</span>
              <span className="text-muted">/</span>
              <span className="font-[family-name:var(--font-mono)] text-foreground/60">{item.relatedEntityId}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
