import type { RuntimeStatus } from "@/lib/supabase/env";

interface TopbarProps {
  eyebrow: string;
  title: string;
  description: string;
  status: RuntimeStatus;
  action?: React.ReactNode;
}

export function Topbar({ eyebrow, title, description, status, action }: TopbarProps) {
  return (
    <header className="px-4 pb-6 pt-28 sm:px-6 lg:px-8 lg:pt-8">
      <div className="panel flex flex-col gap-5 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="eyebrow">{eyebrow}</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">{description}</p>
            </div>
          </div>
          {action ? <div className="xl:shrink-0">{action}</div> : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="status-pill">
            <span className={status.supabase ? "text-success" : "text-warning"}>o</span>
            Supabase Auth {status.supabase ? "linked" : "mock mode"}
          </div>
          <div className="status-pill">
            <span className={status.storageReady ? "text-success" : "text-warning"}>o</span>
            Storage + DB {status.storageReady ? "server ready" : "pending"}
          </div>
          <div className="status-pill">
            <span className={status.openAi ? "text-success" : "text-warning"}>o</span>
            OpenAI {status.openAi ? "API-ready" : "configure key"}
          </div>
        </div>
      </div>
    </header>
  );
}
