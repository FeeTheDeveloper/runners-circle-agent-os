import type { QueueSnapshot } from "@/lib/services/operator";

interface QueuePanelProps {
  snapshot: QueueSnapshot;
}

function QueueColumn({
  heading,
  description,
  items,
}: {
  heading: string;
  description: string;
  items: QueueSnapshot[keyof QueueSnapshot];
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-black/20 p-4 sm:p-5">
      <p className="eyebrow">{heading}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={`${heading}-${item.key}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
          >
            <p className="text-sm font-medium capitalize text-foreground">{item.label}</p>
            <div className="status-pill">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QueuePanel({ snapshot }: QueuePanelProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Queue Snapshot</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Everything waiting, moving, or blocked</h2>
        </div>
        <div className="status-pill">Command flow</div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <QueueColumn
          heading="Agent tasks"
          description="Work units moving through the direct ChatGPT Agent contract layer."
          items={snapshot.agentTasks}
        />
        <QueueColumn
          heading="Campaigns"
          description="Packages being assembled, reviewed, activated, or held in place."
          items={snapshot.campaigns}
        />
        <QueueColumn
          heading="Promotions"
          description="Channel-ready outbound packages progressing toward review and launch."
          items={snapshot.promotions}
        />
        <QueueColumn
          heading="Video jobs"
          description="Video render jobs currently moving through the render pipeline."
          items={snapshot.videoJobs}
        />
      </div>
    </section>
  );
}
