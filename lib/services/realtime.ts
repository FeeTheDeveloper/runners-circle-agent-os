import { getRecentActivity } from "@/lib/services/activity";
import { getAgentTasks } from "@/lib/services/agent-tasks";
import { getDistributionJobs } from "@/lib/services/distribution";
import { getPendingReviews } from "@/lib/services/reviews";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getWorkflowProgress, getWorkflowRuns } from "@/lib/services/workflows";

export interface RealtimeSubscriptionDescriptor {
  key: "activity" | "workflows" | "reviews" | "generations" | "operator_queue" | "distribution";
  label: string;
  enabled: boolean;
  provider: "supabase_realtime" | "fallback_polling";
  channel: string;
}

export interface RealtimeReadinessSummary {
  provider: "supabase_realtime" | "fallback_polling";
  realtimeEnabled: boolean;
  subscriptions: RealtimeSubscriptionDescriptor[];
  notes: string[];
}

export interface RealtimeTaskFeedItem {
  id: string;
  title: string;
  status: string;
  source: string;
  href: string;
  updatedAt: string;
}

function getProvider() {
  return isSupabaseConfigured() ? "supabase_realtime" : "fallback_polling";
}

export function getRealtimeSubscriptions(teamId?: string | null) {
  const provider = getProvider();
  const teamScope = teamId ?? "personal";

  return [
    {
      key: "activity",
      label: "Activity feed updates",
      enabled: true,
      provider,
      channel: `activity:${teamScope}`,
    },
    {
      key: "workflows",
      label: "Workflow updates",
      enabled: true,
      provider,
      channel: `workflows:${teamScope}`,
    },
    {
      key: "reviews",
      label: "Review queue updates",
      enabled: true,
      provider,
      channel: `reviews:${teamScope}`,
    },
    {
      key: "generations",
      label: "Generation progress updates",
      enabled: true,
      provider,
      channel: `generations:${teamScope}`,
    },
    {
      key: "distribution",
      label: "Distribution queue updates",
      enabled: true,
      provider,
      channel: `distribution:${teamScope}`,
    },
    {
      key: "operator_queue",
      label: "Operator queue updates",
      enabled: true,
      provider,
      channel: `operator:${teamScope}`,
    },
  ] satisfies RealtimeSubscriptionDescriptor[];
}

export function getRealtimeReadiness(teamId?: string | null): RealtimeReadinessSummary {
  const provider = getProvider();

  return {
    provider,
    realtimeEnabled: provider === "supabase_realtime",
    subscriptions: getRealtimeSubscriptions(teamId),
    notes:
      provider === "supabase_realtime"
        ? ["Supabase Realtime can back live command-room updates when database persistence is active."]
        : ["Supabase Realtime is not configured, so the command layer is running in graceful fallback mode."],
  };
}

export function getRealtimeTaskFeed(limit = 6) {
  const taskItems = getAgentTasks()
    .slice(0, limit)
    .map((task) => ({
      id: `task_feed_${task.id}`,
      title: task.agentName,
      status: task.status,
      source: task.taskType.replaceAll("_", " "),
      href: "/agents",
      updatedAt: task.updatedAt,
    }));
  const workflowItems = getWorkflowRuns()
    .slice(0, limit)
    .map((run) => ({
      id: `workflow_feed_${run.id}`,
      title: typeof run.input.campaignName === "string" ? run.input.campaignName : run.templateId,
      status: run.status,
      source: getWorkflowProgress(run.id)?.currentStepName ?? "workflow",
      href: `/workflows/${run.id}`,
      updatedAt: run.updatedAt,
    }));
  const distributionItems = getDistributionJobs()
    .slice(0, limit)
    .map((job) => ({
      id: `distribution_feed_${job.id}`,
      title: `${job.channel.replaceAll("_", " ")} distribution`,
      status: job.status,
      source: job.provider,
      href: "/distribution",
      updatedAt: job.updatedAt,
    }));

  return [...taskItems, ...workflowItems, ...distributionItems]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, limit);
}

export function getRealtimeOperatorSnapshot(teamId?: string | null) {
  return {
    readiness: getRealtimeReadiness(teamId),
    recentActivity: getRecentActivity(6),
    pendingReviews: getPendingReviews(teamId),
    taskFeed: getRealtimeTaskFeed(6),
  };
}
