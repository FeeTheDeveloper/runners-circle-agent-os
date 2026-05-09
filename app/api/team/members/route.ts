import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/services/profiles";
import { inviteTeamMember, removeTeamMember, updateTeamMemberRole } from "@/lib/services/teams";
import { teamRoles } from "@/lib/types/team";

export const runtime = "nodejs";

const inviteSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(teamRoles),
});

const updateSchema = z.object({
  teamMemberId: z.string().min(1),
  role: z.enum(teamRoles),
});

const removeSchema = z.object({
  teamMemberId: z.string().min(1),
});

function getActingUserId(profile: Awaited<ReturnType<typeof getCurrentProfile>>) {
  return profile.user?.id ?? profile.profile?.user_id ?? "mock-user";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = inviteSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid invite payload.",
          },
        },
        { status: 400 },
      );
    }

    const profile = await getCurrentProfile();
    const member = await inviteTeamMember({
      ...parsed.data,
      invitedBy: getActingUserId(profile),
    });

    return NextResponse.json({
      success: true,
      data: {
        member,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to invite team member.",
        },
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json();
    const parsed = updateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid team role payload.",
          },
        },
        { status: 400 },
      );
    }

    const profile = await getCurrentProfile();
    const member = await updateTeamMemberRole(parsed.data.teamMemberId, parsed.data.role, getActingUserId(profile));

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Team member not found.",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        member,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to update team member role.",
        },
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await request.json();
    const parsed = removeSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid removal payload.",
          },
        },
        { status: 400 },
      );
    }

    const profile = await getCurrentProfile();
    const removed = await removeTeamMember(parsed.data.teamMemberId, getActingUserId(profile));

    if (!removed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Team member not found.",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to remove team member.",
        },
      },
      { status: 400 },
    );
  }
}
