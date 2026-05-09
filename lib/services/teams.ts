import { mockTeam, mockTeamMembers } from "@/lib/data/mock-team";
import { createActivityEvent } from "@/lib/services/activity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { TeamRow, TeamMemberRow } from "@/lib/types/database";
import type { CreateTeamInput, InviteTeamMemberInput, Team, TeamMember, TeamRole } from "@/lib/types/team";

const teamsStore: Team[] = [mockTeam];
const teamMembersStore: TeamMember[] = mockTeamMembers.map((member) => ({ ...member }));

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createTeamId() {
  return `team_${crypto.randomUUID().slice(0, 8)}`;
}

function createTeamMemberId() {
  return `team_member_${crypto.randomUUID().slice(0, 8)}`;
}

function cloneTeam(team: Team): Team {
  return { ...team };
}

function cloneMember(member: TeamMember): TeamMember {
  return { ...member };
}

function normalizeUserId(userId?: string | null) {
  return userId?.trim() || "mock-user";
}

function canManageRole(actingRole: TeamRole | null, targetRole?: TeamRole) {
  if (!actingRole) {
    return false;
  }

  if (actingRole === "owner") {
    return true;
  }

  if (actingRole === "admin") {
    return targetRole !== "owner";
  }

  return false;
}

function mapTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTeamMemberRow(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
  };
}

function getMockTeamById(teamId: string) {
  return teamsStore.find((team) => team.id === teamId) ?? null;
}

function getMockTeamMember(teamId: string, userId: string) {
  return teamMembersStore.find((member) => member.teamId === teamId && member.userId === userId) ?? null;
}

function getMockTeamMemberById(teamMemberId: string) {
  return teamMembersStore.find((member) => member.id === teamMemberId) ?? null;
}

function ensureMockManager(teamId: string, userId: string, targetRole?: TeamRole) {
  const actingMember = getMockTeamMember(teamId, userId);
  const actingRole = actingMember?.role ?? (getMockTeamById(teamId)?.ownerUserId === userId ? "owner" : null);

  if (!canManageRole(actingRole, targetRole)) {
    throw new Error("You do not have permission to manage this team.");
  }
}

async function getSupabaseAuthUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    userId: user?.id ?? null,
  };
}

async function getSupabaseTeamRole(teamId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as TeamRole;
}

export async function getCurrentUserTeams(userId?: string | null) {
  const resolvedUserId = normalizeUserId(userId);

  if (!isSupabaseConfigured()) {
    const teamIds = teamMembersStore.filter((member) => member.userId === resolvedUserId).map((member) => member.teamId);
    const ownedTeams = teamsStore.filter((team) => team.ownerUserId === resolvedUserId);
    const memberTeams = teamsStore.filter((team) => teamIds.includes(team.id));

    return [...new Map([...ownedTeams, ...memberTeams].map((team) => [team.id, cloneTeam(team)])).values()];
  }

  try {
    const { supabase, userId: authUserId } = await getSupabaseAuthUserId();

    if (!authUserId || authUserId !== resolvedUserId) {
      return [];
    }

    const { data: teamMemberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", authUserId);

    if (membershipError) {
      return [];
    }

    const teamIds = teamMemberships.map((membership) => membership.team_id);

    if (teamIds.length === 0) {
      return [];
    }

    const { data: teams, error } = await supabase.from("teams").select("*").in("id", teamIds).order("created_at", { ascending: false });

    if (error || !teams) {
      return [];
    }

    return teams.map((team) => mapTeamRow(team as TeamRow));
  } catch {
    return teamsStore.filter((team) => team.ownerUserId === resolvedUserId).map(cloneTeam);
  }
}

export async function getPrimaryTeamForUser(userId?: string | null) {
  return (await getCurrentUserTeams(userId))[0] ?? null;
}

export async function getTeamRoleForUser(teamId: string, userId?: string | null): Promise<TeamRole | null> {
  const resolvedUserId = normalizeUserId(userId);

  if (!isSupabaseConfigured()) {
    const team = getMockTeamById(teamId);

    if (team?.ownerUserId === resolvedUserId) {
      return "owner";
    }

    return getMockTeamMember(teamId, resolvedUserId)?.role ?? null;
  }

  try {
    const { userId: authUserId } = await getSupabaseAuthUserId();

    if (!authUserId || authUserId !== resolvedUserId) {
      return null;
    }

    return await getSupabaseTeamRole(teamId, authUserId);
  } catch {
    return null;
  }
}

export async function getTeam(teamId: string) {
  if (!isSupabaseConfigured()) {
    const team = getMockTeamById(teamId);
    return team ? cloneTeam(team) : null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapTeamRow(data as TeamRow);
  } catch {
    const team = getMockTeamById(teamId);
    return team ? cloneTeam(team) : null;
  }
}

export async function getTeamMembers(teamId: string) {
  if (!isSupabaseConfigured()) {
    return teamMembersStore
      .filter((member) => member.teamId === teamId)
      .sort((left, right) => Date.parse(left.joinedAt) - Date.parse(right.joinedAt))
      .map(cloneMember);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("team_members").select("*").eq("team_id", teamId).order("joined_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((member) => mapTeamMemberRow(member as TeamMemberRow));
  } catch {
    return teamMembersStore.filter((member) => member.teamId === teamId).map(cloneMember);
  }
}

export async function createTeam(input: CreateTeamInput) {
  const name = input.name.trim();
  const ownerUserId = normalizeUserId(input.ownerUserId);

  if (!name) {
    throw new Error("Team name is required.");
  }

  if (!isSupabaseConfigured()) {
    const timestamp = nowIso();
    const team: Team = {
      id: createTeamId(),
      name,
      slug: slugify(name),
      ownerUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const ownerMembership: TeamMember = {
      id: createTeamMemberId(),
      teamId: team.id,
      userId: ownerUserId,
      role: "owner",
      invitedBy: ownerUserId,
      joinedAt: timestamp,
    };

    teamsStore.unshift(team);
    teamMembersStore.unshift(ownerMembership);
    createActivityEvent({
      type: "team_member_invited",
      severity: "success",
      title: `${team.name} created`,
      description: "A new team command layer is ready for collaborative work.",
      relatedEntityType: "team",
      relatedEntityId: team.id,
      actor: ownerUserId,
    });

    return cloneTeam(team);
  }

  const { supabase, userId } = await getSupabaseAuthUserId();

  if (!userId || userId !== ownerUserId) {
    throw new Error("Only the authenticated owner can create a team.");
  }

  const { data: insertedTeam, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      slug: slugify(name),
      owner_user_id: ownerUserId,
    })
    .select("*")
    .single();

  if (teamError || !insertedTeam) {
    throw new Error(teamError?.message ?? "Unable to create team.");
  }

  const joinedAt = nowIso();
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: insertedTeam.id,
    user_id: ownerUserId,
    role: "owner",
    invited_by: ownerUserId,
    joined_at: joinedAt,
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return mapTeamRow(insertedTeam as TeamRow);
}

export async function inviteTeamMember(input: InviteTeamMemberInput) {
  const teamId = input.teamId;
  const invitedUserId = normalizeUserId(input.userId);
  const invitedBy = normalizeUserId(input.invitedBy);

  if (input.role === "owner") {
    throw new Error("Owner role cannot be assigned through invitations.");
  }

  if (!isSupabaseConfigured()) {
    ensureMockManager(teamId, invitedBy, input.role);

    const existingMember = getMockTeamMember(teamId, invitedUserId);

    if (existingMember) {
      return cloneMember(existingMember);
    }

    const member: TeamMember = {
      id: createTeamMemberId(),
      teamId,
      userId: invitedUserId,
      role: input.role,
      invitedBy,
      joinedAt: nowIso(),
    };

    teamMembersStore.unshift(member);
    createActivityEvent({
      type: "team_member_invited",
      severity: "info",
      title: `${invitedUserId} invited`,
      description: `${invitedUserId} joined the team command layer as ${input.role}.`,
      relatedEntityType: "team",
      relatedEntityId: teamId,
      actor: invitedBy,
    });

    return cloneMember(member);
  }

  const { supabase, userId } = await getSupabaseAuthUserId();

  if (!userId || userId !== invitedBy) {
    throw new Error("Only the authenticated actor can invite a team member.");
  }

  const actingRole = await getSupabaseTeamRole(teamId, userId);

  if (!canManageRole(actingRole, input.role)) {
    throw new Error("You do not have permission to invite this role.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", invitedUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return mapTeamMemberRow(existing as TeamMemberRow);
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: teamId,
      user_id: invitedUserId,
      role: input.role,
      invited_by: invitedBy,
      joined_at: nowIso(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to invite team member.");
  }

  return mapTeamMemberRow(data as TeamMemberRow);
}

export async function updateTeamMemberRole(teamMemberId: string, role: TeamRole, actingUserId?: string | null) {
  const resolvedActingUserId = normalizeUserId(actingUserId);

  if (role === "owner") {
    throw new Error("Owner role cannot be assigned from this action.");
  }

  if (!isSupabaseConfigured()) {
    const member = getMockTeamMemberById(teamMemberId);

    if (!member) {
      return null;
    }

    ensureMockManager(member.teamId, resolvedActingUserId, member.role);

    if (member.role === "owner") {
      throw new Error("Owner role cannot be changed from this action.");
    }

    member.role = role;
    createActivityEvent({
      type: "team_member_role_updated",
      severity: "info",
      title: `${member.userId} role updated`,
      description: `${member.userId} is now assigned as ${role}.`,
      relatedEntityType: "team",
      relatedEntityId: member.teamId,
      actor: resolvedActingUserId,
    });

    return cloneMember(member);
  }

  const { supabase, userId } = await getSupabaseAuthUserId();

  if (!userId || userId !== resolvedActingUserId) {
    throw new Error("Only the authenticated actor can update a team role.");
  }

  const { data: existing, error: lookupError } = await supabase.from("team_members").select("*").eq("id", teamMemberId).maybeSingle();

  if (lookupError || !existing) {
    return null;
  }

  const existingMember = existing as TeamMemberRow;
  const actingRole = await getSupabaseTeamRole(existingMember.team_id, userId);

  if (!canManageRole(actingRole, existingMember.role)) {
    throw new Error("You do not have permission to update this team member.");
  }

  if (existingMember.role === "owner") {
    throw new Error("Owner role cannot be changed from this action.");
  }

  const { data, error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", teamMemberId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update team member role.");
  }

  return mapTeamMemberRow(data as TeamMemberRow);
}

export async function removeTeamMember(teamMemberId: string, actingUserId?: string | null) {
  const resolvedActingUserId = normalizeUserId(actingUserId);

  if (!isSupabaseConfigured()) {
    const memberIndex = teamMembersStore.findIndex((member) => member.id === teamMemberId);

    if (memberIndex < 0) {
      return false;
    }

    const member = teamMembersStore[memberIndex];
    ensureMockManager(member.teamId, resolvedActingUserId, member.role);

    if (member.role === "owner") {
      throw new Error("Owner membership cannot be removed from this action.");
    }

    teamMembersStore.splice(memberIndex, 1);
    return true;
  }

  const { supabase, userId } = await getSupabaseAuthUserId();

  if (!userId || userId !== resolvedActingUserId) {
    throw new Error("Only the authenticated actor can remove a team member.");
  }

  const { data: existing, error: lookupError } = await supabase.from("team_members").select("*").eq("id", teamMemberId).maybeSingle();

  if (lookupError || !existing) {
    return false;
  }

  const existingMember = existing as TeamMemberRow;
  const actingRole = await getSupabaseTeamRole(existingMember.team_id, userId);

  if (!canManageRole(actingRole, existingMember.role)) {
    throw new Error("You do not have permission to remove this team member.");
  }

  if (existingMember.role === "owner") {
    throw new Error("Owner membership cannot be removed from this action.");
  }

  const { error } = await supabase.from("team_members").delete().eq("id", teamMemberId);

  return !error;
}
