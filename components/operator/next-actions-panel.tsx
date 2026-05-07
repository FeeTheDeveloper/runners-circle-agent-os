import Link from "next/link";
import clsx from "clsx";
import type { RecommendedAction } from "@/lib/services/operator";

interface NextActionsPanelProps {
  actions: RecommendedAction[];
}

const priorityStyles = {
  normal: "border-white/10 bg-white/[0.04] text-foreground/80",
  high: "border-orange/20 bg-orange/10 text-orange-soft",
  urgent: "border-danger/30 bg-danger/10 text-danger",
};

export function NextActionsPanel({ actions }: NextActionsPanelProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Next Moves</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Recommended operator actions</h2>
        </div>
        <div className="status-pill border-electric/20 bg-electric/10 text-electric">Execution guidance</div>
      </div>

      <div className="mt-6 space-y-3">
        {actions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
            <p className="text-sm text-muted">No operator actions are recommended right now.</p>
          </div>
        ) : null}

        {actions.map((action) => (
          <article key={action.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{action.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{action.description}</p>
              </div>
              <div className={clsx("status-pill", priorityStyles[action.priority])}>{action.priority}</div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-foreground/70">{action.source}</p>
              <Link href={action.href} className="text-sm font-medium text-electric transition hover:text-electric/80">
                Open lane
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
