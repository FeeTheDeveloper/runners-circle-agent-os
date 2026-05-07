"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FolderKanban,
  LayoutDashboard,
  LibraryBig,
  Rocket,
  Settings,
  Sparkles,
  SquareTerminal,
} from "lucide-react";
import clsx from "clsx";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Sparkles },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/media", label: "Media Library", icon: LibraryBig },
  { href: "/campaigns", label: "Campaigns", icon: FolderKanban },
  { href: "/promotions", label: "Promotions", icon: Rocket },
  { href: "/operator", label: "Operator Console", icon: SquareTerminal },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="panel fixed inset-x-4 top-4 z-40 border-white/12 p-4 lg:inset-y-4 lg:left-4 lg:right-auto lg:w-64">
      <div className="flex items-center justify-between lg:block">
        <div>
          <p className="eyebrow">Runners Circle</p>
          <div className="mt-2">
            <h1 className="text-lg font-semibold text-foreground">Agent OS</h1>
            <p className="mt-1 text-sm text-muted">AI media control layer</p>
          </div>
        </div>
        <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">Live pipeline</div>
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
          Existing ChatGPT Agents handle execution. This app assigns work, stores outputs, and packages campaigns.
        </p>
      </div>
    </aside>
  );
}

