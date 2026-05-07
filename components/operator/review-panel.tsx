import type { ReviewQueueItem } from "@/lib/services/operator";

interface ReviewPanelProps {
  items: ReviewQueueItem[];
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReviewPanel({ items }: ReviewPanelProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Review Queue</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Items waiting on operator eyes</h2>
        </div>
        <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">{items.length} pending</div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
            <p className="text-sm text-muted">No review items are waiting in the queue.</p>
          </div>
        ) : null}

        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </div>
              <div className="status-pill">{item.status.replaceAll("_", " ")}</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
              <span>{item.owner}</span>
              <span className="text-muted">/</span>
              <span>{item.entityType.replaceAll("_", " ")}</span>
              <span className="text-muted">/</span>
              <span>{formatTimestamp(item.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
