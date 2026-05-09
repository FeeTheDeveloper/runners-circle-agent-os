import clsx from "clsx";
import type { TeamRole } from "@/lib/types/team";

interface TeamRoleBadgeProps {
  role: TeamRole;
}

const roleStyles: Record<TeamRole, string> = {
  owner: "border-orange/20 bg-orange/10 text-orange-soft",
  admin: "border-electric/20 bg-electric/10 text-electric",
  operator: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  editor: "border-white/10 bg-white/[0.04] text-foreground/80",
  reviewer: "border-warning/30 bg-warning/10 text-warning",
  viewer: "border-white/10 bg-white/[0.04] text-muted",
};

export function TeamRoleBadge({ role }: TeamRoleBadgeProps) {
  return <span className={clsx("status-pill capitalize", roleStyles[role])}>{role}</span>;
}
