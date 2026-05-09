"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DistributionJob } from "@/lib/types/distribution";

interface PublishActionPanelProps {
  job: Pick<DistributionJob, "id" | "provider" | "status" | "scheduledFor">;
}

interface DistributionMutationResponse {
  success: boolean;
  error?: {
    message: string;
  };
}

function toLocalInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function PublishActionPanel({ job }: PublishActionPanelProps) {
  const router = useRouter();
  const [scheduleAt, setScheduleAt] = useState(toLocalInputValue(job.scheduledFor));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const publishLabel = job.provider === "mock" ? "Publish mock" : "Prepare publish";
  const isTerminal = job.status === "published" || job.status === "cancelled";

  async function submitRequest(input: {
    url: string;
    method?: "POST" | "PATCH";
    body?: Record<string, unknown>;
    successMessage: string;
  }) {
    setFeedback(null);

    try {
      const response = await fetch(input.url, {
        method: input.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
      });
      const body = (await response.json()) as DistributionMutationResponse;

      if (!response.ok || !body.success) {
        setFeedback(body.error?.message ?? "Unable to update this distribution job.");
        return;
      }

      setFeedback(input.successMessage);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Unable to reach the distribution API right now.");
    }
  }

  async function handleSchedule() {
    if (!scheduleAt) {
      setFeedback("Pick a schedule time before sending this job to the scheduler.");
      return;
    }

    await submitRequest({
      url: "/api/distribution/schedule",
      body: {
        jobId: job.id,
        scheduledFor: new Date(scheduleAt).toISOString(),
      },
      successMessage: "Distribution job scheduled.",
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(event) => setScheduleAt(event.target.value)}
          disabled={isPending || isTerminal}
          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition focus:border-electric/40 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSchedule}
          disabled={isPending || isTerminal}
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:border-electric/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Schedule
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            submitRequest({
              url: "/api/distribution/publish",
              body: {
                jobId: job.id,
              },
              successMessage: job.provider === "mock" ? "Mock publish completed." : "Manual publish handoff prepared.",
            })
          }
          disabled={isPending || isTerminal}
          className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {publishLabel}
        </button>
        <button
          type="button"
          onClick={() =>
            submitRequest({
              url: `/api/distribution/${job.id}`,
              method: "PATCH",
              body: {
                action: "retry",
              },
              successMessage: "Distribution job reset for another attempt.",
            })
          }
          disabled={isPending || !["failed", "cancelled"].includes(job.status)}
          className="inline-flex items-center justify-center rounded-full border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() =>
            submitRequest({
              url: `/api/distribution/${job.id}`,
              method: "PATCH",
              body: {
                action: "cancel",
              },
              successMessage: "Distribution job cancelled.",
            })
          }
          disabled={isPending || job.status === "published" || job.status === "cancelled"}
          className="inline-flex items-center justify-center rounded-full border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted">{feedback}</div>
      ) : null}
    </div>
  );
}
