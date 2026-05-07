import { mockActivityEvents } from "@/lib/data/activity";
import type {
  ActivityEntityType,
  ActivityEvent,
  ActivitySeverity,
  CreateActivityEventInput,
} from "@/lib/types/activity";

const activityEventsStore = [...mockActivityEvents];

function nowIso() {
  return new Date().toISOString();
}

function createActivityId() {
  return `activity_${crypto.randomUUID().slice(0, 8)}`;
}

function sortByNewest(left: ActivityEvent, right: ActivityEvent) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

export function getActivityEvents(): ActivityEvent[] {
  return [...activityEventsStore].sort(sortByNewest);
}

export function getRecentActivity(limit: number): ActivityEvent[] {
  return getActivityEvents().slice(0, Math.max(limit, 0));
}

export function createActivityEvent(input: CreateActivityEventInput): ActivityEvent {
  const event: ActivityEvent = {
    id: createActivityId(),
    createdAt: nowIso(),
    ...input,
  };

  activityEventsStore.unshift(event);

  // TODO: Persist activity events to Supabase Postgres once the event log is backed by the database.
  // TODO: Broadcast activity updates over realtime subscriptions when live operator updates are introduced.

  return event;
}

export function getActivityByEntity(entityType: ActivityEntityType, entityId: string): ActivityEvent[] {
  return getActivityEvents().filter(
    (event) => event.relatedEntityType === entityType && event.relatedEntityId === entityId,
  );
}

export function getActivityBySeverity(severity: ActivitySeverity): ActivityEvent[] {
  return getActivityEvents().filter((event) => event.severity === severity);
}
