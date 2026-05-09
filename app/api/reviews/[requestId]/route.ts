import { NextResponse } from "next/server";
import { z } from "zod";
import { approveRequest, rejectRequest, requestChanges } from "@/lib/services/reviews";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  notes: z.string().optional(),
});

interface ReviewRequestRouteProps {
  params: Promise<{
    requestId: string;
  }>;
}

export async function PATCH(request: Request, { params }: ReviewRequestRouteProps) {
  try {
    const { requestId } = await params;
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid review action payload.",
          },
        },
        { status: 400 },
      );
    }

    const reviewRequest =
      parsed.data.action === "approve"
        ? approveRequest(requestId, parsed.data.notes)
        : parsed.data.action === "reject"
          ? rejectRequest(requestId, parsed.data.notes)
          : requestChanges(requestId, parsed.data.notes);

    if (!reviewRequest) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Review request not found.",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reviewRequest,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to update review request.",
        },
      },
      { status: 400 },
    );
  }
}
