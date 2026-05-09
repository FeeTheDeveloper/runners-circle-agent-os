"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalEntityType } from "@/lib/types/team";

interface RequestReviewButtonProps {
  entityType: ApprovalEntityType;
  entityId: string;
  label?: string;
  notes?: string;
  assignedReviewerId?: string | null;
  compact?: boolean;
}

interface ReviewMutationResponse {
  success: boolean;
  error?: {
    message: string;
  };
}

export function RequestReviewButton({
  entityType,
  entityId,
  label = "Request review",
  notes,
  assignedReviewerId,
  compact = false,
}: RequestReviewButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setFeedback(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType,
          entityId,
          notes,
          assignedReviewerId,
        }),
      });
      const body = (await response.json()) as ReviewMutationResponse;

      if (!response.ok || !body.success) {
        setState("error");
        setFeedback(body.error?.message ?? "Unable to request review.");
        return;
      }

      setState("success");
      setFeedback("Review requested.");
      router.refresh();
    } catch {
      setState("error");
      setFeedback("Unable to request review right now.");
    }
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-3"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        className={
          compact
            ? "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground/80 transition hover:border-electric/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:border-electric/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {state === "loading" ? "Requesting..." : label}
      </button>
      {feedback ? (
        <div
          className={
            state === "error"
              ? "rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
              : "rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground"
          }
        >
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
