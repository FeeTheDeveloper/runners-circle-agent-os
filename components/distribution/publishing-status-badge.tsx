import clsx from "clsx";
import type { DistributionStatus } from "@/lib/types/distribution";

interface PublishingStatusBadgeProps {
  status: DistributionStatus;
}

const toneByStatus: Record<DistributionStatus, string> = {
  draft: "border-white/10 bg-white/[0.04] text-foreground/80",
  ready: "border-electric/20 bg-electric/10 text-electric",
  scheduled: "border-orange/20 bg-orange/10 text-orange-soft",
  publishing: "border-warning/30 bg-warning/10 text-warning",
  published: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  failed: "border-danger/30 bg-danger/10 text-danger",
  cancelled: "border-white/10 bg-white/[0.04] text-foreground/60",
};

export function PublishingStatusBadge({ status }: PublishingStatusBadgeProps) {
  return <div className={clsx("status-pill capitalize", toneByStatus[status])}>{status.replaceAll("_", " ")}</div>;
}
