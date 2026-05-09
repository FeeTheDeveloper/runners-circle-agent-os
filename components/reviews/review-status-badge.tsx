import clsx from "clsx";
import type { ReviewStatus } from "@/lib/types/team";

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

const statusStyles: Record<ReviewStatus, string> = {
  pending_review: "border-orange/20 bg-orange/10 text-orange-soft",
  approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  rejected: "border-danger/30 bg-danger/10 text-danger",
  changes_requested: "border-warning/30 bg-warning/10 text-warning",
};

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return (
    <span className={clsx("status-pill capitalize", statusStyles[status])}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
