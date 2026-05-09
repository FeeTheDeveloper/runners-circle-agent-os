"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { teamRoles, type TeamRole } from "@/lib/types/team";

interface InviteMemberFormProps {
  teamId: string;
}

interface TeamMemberMutationResponse {
  success: boolean;
  error?: {
    message: string;
  };
}

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-orange/40";

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<TeamRole>("viewer");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleInvite() {
    if (!userId.trim()) {
      setState("error");
      setFeedback("A user id or email is required.");
      return;
    }

    setState("loading");
    setFeedback(null);

    try {
      const response = await fetch("/api/team/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          userId: userId.trim(),
          role,
        }),
      });
      const body = (await response.json()) as TeamMemberMutationResponse;

      if (!response.ok || !body.success) {
        setState("error");
        setFeedback(body.error?.message ?? "Unable to invite this team member.");
        return;
      }

      setState("success");
      setFeedback(`${userId.trim()} added as ${role}.`);
      setUserId("");
      setRole("viewer");
      router.refresh();
    } catch {
      setState("error");
      setFeedback("Unable to invite this team member right now.");
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Invite Flow</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Add a teammate to the command layer</h2>
        </div>
        <div className="status-pill border-electric/20 bg-electric/10 text-electric">Manual invite</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_220px]">
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="user id or email"
          className={fieldClassName}
        />
        <select value={role} onChange={(event) => setRole(event.target.value as TeamRole)} className={fieldClassName}>
          {teamRoles
            .filter((entry) => entry !== "owner")
            .map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleInvite}
        disabled={state === "loading"}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "loading" ? "Inviting..." : "Invite member"}
      </button>

      {feedback ? (
        <div
          className={
            state === "error"
              ? "mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
              : "mt-4 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground"
          }
        >
          {feedback}
        </div>
      ) : null}
    </section>
  );
}
