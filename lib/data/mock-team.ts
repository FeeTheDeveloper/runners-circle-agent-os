import type { Team, TeamMember } from "@/lib/types/team";

export const DEFAULT_MOCK_TEAM_ID = "team_runners_circle_command";

export const mockTeam: Team = {
  id: DEFAULT_MOCK_TEAM_ID,
  name: "Runners Circle Command",
  slug: "runners-circle-command",
  ownerUserId: "mock-user",
  createdAt: "2026-05-06T10:00:00.000Z",
  updatedAt: "2026-05-07T10:00:00.000Z",
};

export const mockTeamMembers: TeamMember[] = [
  {
    id: "team_member_owner",
    teamId: DEFAULT_MOCK_TEAM_ID,
    userId: "mock-user",
    role: "owner",
    invitedBy: "mock-user",
    joinedAt: "2026-05-06T10:00:00.000Z",
  },
  {
    id: "team_member_operator",
    teamId: DEFAULT_MOCK_TEAM_ID,
    userId: "operator@runnerscircle.local",
    role: "operator",
    invitedBy: "mock-user",
    joinedAt: "2026-05-06T10:05:00.000Z",
  },
  {
    id: "team_member_editor",
    teamId: DEFAULT_MOCK_TEAM_ID,
    userId: "editor@runnerscircle.local",
    role: "editor",
    invitedBy: "mock-user",
    joinedAt: "2026-05-06T10:08:00.000Z",
  },
  {
    id: "team_member_reviewer",
    teamId: DEFAULT_MOCK_TEAM_ID,
    userId: "reviewer@runnerscircle.local",
    role: "reviewer",
    invitedBy: "mock-user",
    joinedAt: "2026-05-06T10:12:00.000Z",
  },
  {
    id: "team_member_viewer",
    teamId: DEFAULT_MOCK_TEAM_ID,
    userId: "viewer@runnerscircle.local",
    role: "viewer",
    invitedBy: "mock-user",
    joinedAt: "2026-05-06T10:20:00.000Z",
  },
];
