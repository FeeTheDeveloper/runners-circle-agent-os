"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bot,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LibraryBig,
  Rocket,
  Send,
  Settings,
  Sparkles,
  SquareTerminal,
  Users,
  Workflow,
} from "lucide-react";
import clsx from "clsx";
import type { RuntimeStatus } from "@/lib/supabase/env";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operator", label: "Operator Console", icon: SquareTerminal },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/studio", label: "Generation", icon: Sparkles },
  { href: "/media", label: "Media Library", icon: LibraryBig },
  { href: "/campaigns", label: "Campaigns", icon: FolderKanban },
  { href: "/promotions", label: "Promotions", icon: Rocket },
  { href: "/distribution", label: "Distribution Queue", icon: Send },
  { href: "/reviews", label: "Reviews", icon: BadgeCheck },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  status: RuntimeStatus;
}

export function Sidebar({ status }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="panel fixed inset-x-4 top-4 z-40 border-white/12 p-4 lg:inset-y-4 lg:left-4 lg:right-auto lg:w-64">
      <div className="flex items-center justify-between lg:block">
        <div>
          <p className="eyebrow">Runners Circle</p>
          <div className="mt-2">
            <h1 className="text-lg font-semibold text-foreground">Agent OS</h1>
            <p className="mt-1 text-sm text-muted">Private command infrastructure</p>
          </div>
        </div>
        <div
          className={
            status.internalOperatorMode
              ? "status-pill border-electric/20 bg-electric/10 text-electric"
              : "status-pill border-orange/20 bg-orange/10 text-orange-soft"
          }
        >
          {status.internalOperatorMode ? "Internal owner" : "Live pipeline"}
        </div>
      </div>

      <nav className="mt-6 grid gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-orange text-black shadow-[0_12px_32px_rgba(255,112,38,0.28)]"
                  : "border border-transparent text-muted hover:border-white/10 hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 hidden rounded-[24px] border border-white/8 bg-black/20 p-4 lg:block">
        <p className="eyebrow">Execution Layer</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Existing ChatGPT Agents still handle execution. The app now prioritizes workflow control, generation intake,
          media state, campaign packaging, operator oversight, and the distribution queue for private operations.
        </p>
      </div>
    </aside>
  );
}
