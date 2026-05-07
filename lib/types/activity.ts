export const activityTypes = [
  "agent_task_created",
  "agent_task_completed",
  "generation_started",
  "generation_completed",
  "media_created",
  "media_downloaded",
  "campaign_created",
  "campaign_updated",
  "promotion_prepared",
  "promotion_ready_for_review",
  "video_job_queued",
  "video_render_started",
  "video_render_completed",
  "video_render_failed",
  "system_warning",
  "system_error",
] as const;

export type ActivityType = (typeof activityTypes)[number];

export const activitySeverities = ["info", "success", "warning", "error"] as const;
export type ActivitySeverity = (typeof activitySeverities)[number];

export const activityEntityTypes = [
  "agent_task",
  "generation_job",
  "media_asset",
  "campaign",
  "promotion_package",
  "system",
] as const;

export type ActivityEntityType = (typeof activityEntityTypes)[number];

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  severity: ActivitySeverity;
  title: string;
  description: string;
  relatedEntityType: ActivityEntityType;
  relatedEntityId: string;
  actor: string;
  createdAt: string;
}

export interface CreateActivityEventInput {
  type: ActivityType;
  severity: ActivitySeverity;
  title: string;
  description: string;
  relatedEntityType: ActivityEntityType;
  relatedEntityId: string;
  actor: string;
}
