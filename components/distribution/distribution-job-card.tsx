import Link from "next/link";
import { agentRegistry } from "@/lib/agents/registry";
import { ChannelIcon } from "@/components/distribution/channel-icon";
import { PublishActionPanel } from "@/components/distribution/publish-action-panel";
import { PublishingStatusBadge } from "@/components/distribution/publishing-status-badge";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { ReviewStatusBadge } from "@/components/reviews/review-status-badge";
import type { DistributionJob } from "@/lib/types/distribution";
import type { ApprovalRequest } from "@/lib/types/team";

interface DistributionJobCardProps {
  job: DistributionJob;
  reviewRequest?: ApprovalRequest | null;
  compact?: boolean;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DistributionJobCard({ job, reviewRequest = null, compact = false }: DistributionJobCardProps) {
  const assignedAgent =
    agentRegistry.find((agent) => agent.id === job.assignedAgentId)?.name ?? job.assignedAgentId ?? "Distribution Engine";
  const requiresApproval = job.metadata.requiresApproval === true;

  return (
    <article className="panel interactive-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ChannelIcon channel={job.channel} />
          <div>
            <p className="eyebrow">Distribution job</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">{formatLabel(job.channel)}</h2>
          </div>
        </div>
        <PublishingStatusBadge status={job.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Provider</p>
          <p className="mt-2 text-sm font-medium capitalize text-foreground">{job.provider.replaceAll("_", " ")}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned agent</p>
          <p className="mt-2 text-sm font-medium text-foreground">{assignedAgent}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Review state</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {reviewRequest ? (
              <ReviewStatusBadge status={reviewRequest.status} />
            ) : requiresApproval ? (
              <span className="status-pill border-warning/30 bg-warning/10 text-warning">approval needed</span>
            ) : (
              <span className="status-pill">not required</span>
            )}
          </div>
          <p className="mt-2 text-xs text-foreground/70">
            Reviewer: {reviewRequest?.assignedReviewerId ?? "Unassigned"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Media assets</p>
          <p className="mt-2 text-sm font-medium text-foreground">{job.mediaAssetIds.length}</p>
          <p className="mt-2 text-xs text-foreground/70">
            Scheduled: {formatTimestamp(job.scheduledFor)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Caption package</p>
        <p className="mt-3 text-sm leading-6 text-muted">{job.caption}</p>
      </div>

      {job.metadata.approvalReason ? (
        <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="field-label">Approval gate</p>
          <p className="mt-2 text-sm leading-6 text-warning">{String(job.metadata.approvalReason)}</p>
        </div>
      ) : null}

      {job.errorMessage ? (
        <div className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <p className="field-label">Failure reason</p>
          <p className="mt-2 text-sm leading-6 text-danger">{job.errorMessage}</p>
        </div>
      ) : null}

      {job.publishedUrl ? (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
          <div>
            <p className="field-label">Published URL</p>
            <p className="mt-2 text-sm text-foreground">{job.publishedUrl}</p>
          </div>
          <Link
            href={job.publishedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-electric transition hover:text-electric/80"
          >
            Open
          </Link>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-5">
          <PublishActionPanel job={job} />
        </div>
      ) : null}

      {requiresApproval && !reviewRequest ? (
        <div className="mt-4">
          <RequestReviewButton
            entityType="distribution_job"
            entityId={job.id}
            notes={`Publishing Approval Request: review the ${formatLabel(job.channel)} distribution job before deployment.`}
          />
        </div>
      ) : null}
    </article>
  );
}
