"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewStatusBadge } from "@/components/reviews/review-status-badge";
import type { ApprovalRequestSummary } from "@/lib/services/reviews";

interface ReviewCardProps {
  request: ApprovalRequestSummary;
  canReview: boolean;
}

interface ReviewMutationResponse {
  success: boolean;
  error?: {
    message: string;
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReviewCard({ request, canReview }: ReviewCardProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(request.notes);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submitAction(action: "approve" | "reject" | "request_changes") {
    setState("loading");
    setFeedback(null);

    try {
      const response = await fetch(`/api/reviews/${request.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          notes,
        }),
      });
      const body = (await response.json()) as ReviewMutationResponse;

      if (!response.ok || !body.success) {
        setState("error");
        setFeedback(body.error?.message ?? "Unable to update this review.");
        return;
      }

      setState("idle");
      router.refresh();
    } catch {
      setState("error");
      setFeedback("Unable to update this review right now.");
    }
  }

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{request.entityType.replaceAll("_", " ")}</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{request.entityLabel}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{request.entityDescription}</p>
        </div>
        <ReviewStatusBadge status={request.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Requested by</p>
          <p className="mt-2 text-sm font-medium text-foreground">{request.requestedBy}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned reviewer</p>
          <p className="mt-2 text-sm font-medium text-foreground">{request.assignedReviewerId ?? "Unassigned"}</p>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={4}
        disabled={!canReview}
        className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition focus:border-orange/40 disabled:cursor-not-allowed disabled:opacity-70"
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-foreground/70">Updated {formatTimestamp(request.updatedAt)}</div>
        <Link href={request.href} className="text-sm font-medium text-electric transition hover:text-electric/80">
          Open source
        </Link>
      </div>

      {canReview ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submitAction("approve")}
            disabled={state === "loading"}
            className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => submitAction("request_changes")}
            disabled={state === "loading"}
            className="inline-flex items-center justify-center rounded-full border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            Request changes
          </button>
          <button
            type="button"
            onClick={() => submitAction("reject")}
            disabled={state === "loading"}
            className="inline-flex items-center justify-center rounded-full border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {feedback}
        </div>
      ) : null}
    </article>
  );
}
