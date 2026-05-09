import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getRuntimeStatus } from "@/lib/supabase/server";

interface AppShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function AppShell({ eyebrow, title, description, children, action }: AppShellProps) {
  const status = getRuntimeStatus();

  return (
    <div className="shell-grid">
      <Sidebar status={status} />
      <div className="lg:pl-72">
        <Topbar eyebrow={eyebrow} title={title} description={description} status={status} action={action} />
        <main className="px-4 pb-10 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
