export const teamRoles = ["owner", "admin", "operator", "editor", "reviewer", "viewer"] as const;
export type TeamRole = (typeof teamRoles)[number];

export const reviewStatuses = ["pending_review", "approved", "rejected", "changes_requested"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const approvalEntityTypes = [
  "media_asset",
  "campaign",
  "promotion_package",
  "workflow_run",
  "execution_package",
  "distribution_job",
] as const;
export type ApprovalEntityType = (typeof approvalEntityTypes)[number];

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string;
  joinedAt: string;
}

export interface ApprovalRequest {
  id: string;
  teamId: string | null;
  entityType: ApprovalEntityType;
  entityId: string;
  requestedBy: string;
  assignedReviewerId: string | null;
  status: ReviewStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamInput {
  name: string;
  ownerUserId: string;
}

export interface InviteTeamMemberInput {
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string;
}

export interface CreateApprovalRequestInput {
  entityType: ApprovalEntityType;
  entityId: string;
  requestedBy: string;
  assignedReviewerId?: string | null;
  notes?: string;
  teamId?: string | null;
}
