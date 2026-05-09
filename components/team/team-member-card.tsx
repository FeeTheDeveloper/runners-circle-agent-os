"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamRoleBadge } from "@/components/team/team-role-badge";
import { teamRoles, type TeamMember, type TeamRole } from "@/lib/types/team";

interface TeamMemberCardProps {
  member: TeamMember;
  canManage: boolean;
  currentUserId: string;
}

interface TeamMemberMutationResponse {
  success: boolean;
  error?: {
    message: string;
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TeamMemberCard({ member, canManage, currentUserId }: TeamMemberCardProps) {
  const router = useRouter();
  const [role, setRole] = useState<TeamRole>(member.role);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const isOwner = member.role === "owner";
  const isCurrentUser = member.userId === currentUserId;

  async function updateRole(nextRole: TeamRole) {
    setRole(nextRole);
    setState("loading");
    setFeedback(null);

    try {
      const response = await fetch("/api/team/members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamMemberId: member.id,
          role: nextRole,
        }),
      });
      const body = (await response.json()) as TeamMemberMutationResponse;

      if (!response.ok || !body.success) {
        setState("error");
        setFeedback(body.error?.message ?? "Unable to update this role.");
        setRole(member.role);
        return;
      }

      setState("idle");
      router.refresh();
    } catch {
      setState("error");
      setFeedback("Unable to update this role right now.");
      setRole(member.role);
    }
  }

  async function removeMember() {
    setState("loading");
    setFeedback(null);

    try {
      const response = await fetch("/api/team/members", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamMemberId: member.id,
        }),
      });
      const body = (await response.json()) as TeamMemberMutationResponse;

      if (!response.ok || !body.success) {
        setState("error");
        setFeedback(body.error?.message ?? "Unable to remove this member.");
        return;
      }

      setState("idle");
      router.refresh();
    } catch {
      setState("error");
      setFeedback("Unable to remove this member right now.");
    }
  }

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Team Member</p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">{member.userId}</h2>
          <p className="mt-2 text-sm text-muted">
            Joined {formatTimestamp(member.joinedAt)}
            {isCurrentUser ? " | You" : ""}
          </p>
        </div>
        <TeamRoleBadge role={role} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Invited by</p>
        <p className="mt-2 text-sm font-medium text-foreground">{member.invitedBy}</p>
      </div>

      {canManage && !isOwner ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={role}
            onChange={(event) => updateRole(event.target.value as TeamRole)}
            disabled={state === "loading"}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition focus:border-orange/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {teamRoles
              .filter((entry) => entry !== "owner")
              .map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={removeMember}
            disabled={state === "loading" || isCurrentUser}
            className="inline-flex items-center justify-center rounded-full border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {feedback}
        </div>
      ) : null}
    </article>
  );
}
