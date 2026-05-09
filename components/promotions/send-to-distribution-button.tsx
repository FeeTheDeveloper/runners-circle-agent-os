"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SendToDistributionButtonProps {
  promotionPackageId: string;
  existingJobsCount?: number;
}

interface DistributionCreateResponse {
  success: boolean;
  data?: {
    distributionJobs?: Array<{ id: string }>;
  };
  error?: {
    message: string;
  };
}

export function SendToDistributionButton({
  promotionPackageId,
  existingJobsCount = 0,
}: SendToDistributionButtonProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setFeedback(null);

    try {
      const response = await fetch("/api/distribution/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotionPackageId,
        }),
      });
      const body = (await response.json()) as DistributionCreateResponse;

      if (!response.ok || !body.success) {
        setFeedback(body.error?.message ?? "Unable to create distribution jobs.");
        return;
      }

      const createdCount = body.data?.distributionJobs?.length ?? 0;
      setFeedback(createdCount > 0 ? `${createdCount} distribution jobs ready.` : "Distribution jobs synced.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Unable to reach the distribution API right now.");
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending..." : existingJobsCount > 0 ? "Sync distribution jobs" : "Send to distribution"}
      </button>
      {feedback ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted">{feedback}</div>
      ) : null}
    </div>
  );
}
