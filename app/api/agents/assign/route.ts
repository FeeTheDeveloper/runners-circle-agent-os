import { NextResponse } from "next/server";
import { z } from "zod";
import { createAgentTask } from "@/lib/services/agent-tasks";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPrimaryTeamForUser } from "@/lib/services/teams";
import { agentTaskPriorities, agentTaskTypes } from "@/lib/types/agents";
import type { AssignAgentApiError, AssignAgentApiSuccess } from "@/lib/types/agents";

export const runtime = "nodejs";

const requestSchema = z.object({
  agentId: z.string().min(1),
  taskType: z.enum(agentTaskTypes),
  priority: z.enum(agentTaskPriorities).optional(),
  input: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      const body: AssignAgentApiError = {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid request payload.",
          code: "INVALID_REQUEST",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const team = await getPrimaryTeamForUser(userId);
    const result = createAgentTask({
      ...parsed.data,
      userId,
      teamId: team?.id ?? null,
    });

    if (!result.success) {
      const body: AssignAgentApiError = {
        success: false,
        error: result.error,
      };

      return NextResponse.json(body, { status: 400 });
    }

    const body: AssignAgentApiSuccess = {
      success: true,
      data: {
        taskId: result.data.id,
        status: result.data.status,
        assignedAgent: result.data.agentName,
        nextStep: result.data.nextStep,
      },
    };

    return NextResponse.json(body, { status: 201 });
  } catch {
    const body: AssignAgentApiError = {
      success: false,
      error: {
        message: "Unexpected error while assigning task.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
