import "server-only";
import {
  cancelVideoGenerationJob,
  failVideoGenerationJob,
  processVideoGenerationJob,
} from "@/lib/services/video-generation";
import type { VideoGenerationJob } from "@/lib/types/generation";

interface RenderQueueEntry {
  jobId: string;
  enqueuedAt: string;
  attempts: number;
}

const queue: RenderQueueEntry[] = [];

function nowIso() {
  return new Date().toISOString();
}

export function enqueueVideoJob(jobId: string): RenderQueueEntry {
  const existing = queue.find((entry) => entry.jobId === jobId);

  if (existing) {
    return existing;
  }

  const entry: RenderQueueEntry = {
    jobId,
    enqueuedAt: nowIso(),
    attempts: 0,
  };

  queue.push(entry);
  return entry;
}

export function dequeueVideoJob(): RenderQueueEntry | null {
  return queue.shift() ?? null;
}

export function peekVideoQueue(): RenderQueueEntry[] {
  return [...queue];
}

export async function processNextVideoJob(): Promise<VideoGenerationJob | null> {
  const next = dequeueVideoJob();

  if (!next) {
    return null;
  }

  next.attempts += 1;

  try {
    const job = await processVideoGenerationJob(next.jobId);

    if (!job) {
      return null;
    }

    if (job.status !== "completed" && job.status !== "failed" && job.status !== "cancelled") {
      queue.push({
        jobId: job.id,
        enqueuedAt: nowIso(),
        attempts: next.attempts,
      });
    }

    return job;
  } catch {
    queue.push({
      jobId: next.jobId,
      enqueuedAt: nowIso(),
      attempts: next.attempts,
    });
    return null;
  }
}

export async function retryVideoJob(jobId: string): Promise<RenderQueueEntry> {
  const filtered = queue.filter((entry) => entry.jobId !== jobId);
  queue.length = 0;
  queue.push(...filtered);

  return enqueueVideoJob(jobId);
}

export async function cancelVideoJob(jobId: string): Promise<VideoGenerationJob | null> {
  const filtered = queue.filter((entry) => entry.jobId !== jobId);
  queue.length = 0;
  queue.push(...filtered);

  return cancelVideoGenerationJob(jobId);
}

export async function failVideoJobInQueue(
  jobId: string,
  errorMessage: string,
): Promise<VideoGenerationJob | null> {
  const filtered = queue.filter((entry) => entry.jobId !== jobId);
  queue.length = 0;
  queue.push(...filtered);

  return failVideoGenerationJob(jobId, errorMessage);
}

export function getRenderQueueDepth(): number {
  return queue.length;
}

// TODO: Replace this in-memory queue with a durable backend.
// Options under evaluation:
//   - Vercel Cron + processNextVideoJob
//   - Supabase Edge Function on a schedule pulling generation_jobs by status
//   - Dedicated worker (Cloudflare Queues, Upstash QStash, Trigger.dev)
