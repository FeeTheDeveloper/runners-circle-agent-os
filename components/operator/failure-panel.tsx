import clsx from "clsx";
import type { FailureSnapshotItem } from "@/lib/services/operator";

interface FailurePanelProps {
  failures: FailureSnapshotItem[];
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FailurePanel({ failures }: FailurePanelProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Failure Snapshot</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Failures and system pressure points</h2>
        </div>
        <div className="status-pill border-danger/30 bg-danger/10 text-danger">{failures.length} open</div>
      </div>

      <div className="mt-6 space-y-3">
        {failures.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
            <p className="text-sm text-muted">No failures are active right now.</p>
          </div>
        ) : null}

        {failures.map((failure) => (
          <article key={failure.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{failure.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{failure.description}</p>
              </div>
              <div
                className={clsx(
                  "status-pill",
                  failure.severity === "error"
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {failure.status.replaceAll("_", " ")}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
              <span>{failure.owner}</span>
              <span className="text-muted">/</span>
              <span>{failure.entityType.replaceAll("_", " ")}</span>
              <span className="text-muted">/</span>
              <span>{formatTimestamp(failure.updatedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
