import { NextResponse } from "next/server";
import { z } from "zod";
import { createDistributionJobsFromPromotionPackage, getDistributionActorContext } from "@/lib/services/distribution";
import { getPromotionPackageById } from "@/lib/services/promotions";
import { createApprovalRequest, getLatestApprovalRequestForEntity } from "@/lib/services/reviews";
import { distributionChannels, publishingProviders, type DistributionError } from "@/lib/types/distribution";

export const runtime = "nodejs";

const requestSchema = z.object({
  promotionPackageId: z.string().min(1),
  channels: z.array(z.enum(distributionChannels)).optional(),
  provider: z.enum(publishingProviders).optional(),
  requireApproval: z.boolean().optional(),
});

function getUnauthorizedResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return getUnauthorizedResponse(parsed.error.issues[0]?.message ?? "Invalid distribution payload.", 400);
    }

    const promotionPackage = getPromotionPackageById(parsed.data.promotionPackageId);

    if (!promotionPackage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Promotion package not found.",
            code: "PROMOTION_PACKAGE_NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    const actorContext = await getDistributionActorContext(promotionPackage.teamId ?? null);

    if (actorContext.currentProfile.mode === "supabase" && !actorContext.currentProfile.isAuthenticated) {
      return getUnauthorizedResponse("Authentication is required to create distribution jobs.", 401);
    }

    if (!actorContext.team || !actorContext.teamRole) {
      return getUnauthorizedResponse("Team membership is required to create distribution jobs.", 403);
    }

    if (!actorContext.canManage) {
      return getUnauthorizedResponse("Your role cannot create distribution jobs.", 403);
    }

    const result = createDistributionJobsFromPromotionPackage({
      promotionPackageId: parsed.data.promotionPackageId,
      channels: parsed.data.channels,
      provider: parsed.data.provider ?? "manual",
      metadata: {
        requireApproval: parsed.data.requireApproval,
        requestedByUserId: actorContext.userId,
      },
    });

    if (!result.success) {
      const status = result.error.code === "PROMOTION_PACKAGE_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    const approvalRequests = result.data.distributionJobs.flatMap((job) => {
      if (job.metadata.requiresApproval !== true) {
        return [];
      }

      const latestRequest = getLatestApprovalRequestForEntity("distribution_job", job.id);

      if (latestRequest && ["pending_review", "approved"].includes(latestRequest.status)) {
        return [latestRequest];
      }

      return [
        createApprovalRequest({
          entityType: "distribution_job",
          entityId: job.id,
          requestedBy: actorContext.userId,
          teamId: actorContext.team?.id ?? null,
          notes: `Publishing Approval Request: review the ${job.channel.replaceAll("_", " ")} distribution handoff before deployment.`,
        }),
      ];
    });

    return NextResponse.json({
      success: true,
      data: {
        distributionJobs: result.data.distributionJobs,
        approvalRequests,
      },
    });
  } catch {
    const body: DistributionError = {
      success: false,
      error: {
        message: "Unexpected error while creating distribution jobs.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
