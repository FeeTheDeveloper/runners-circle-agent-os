import clsx from "clsx";
import type { BrandTone } from "@/lib/types/brand";

interface BrandModeBadgesProps {
  active: boolean;
  profileName: string;
  tone: BrandTone | string;
  compact?: boolean;
}

export function BrandModeBadges({ active, profileName, tone, compact = false }: BrandModeBadgesProps) {
  return (
    <div className={clsx("flex flex-wrap gap-2", compact ? "items-center" : "")}>
      <div
        className={
          active
            ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
            : "status-pill border-white/10 bg-white/[0.04] text-muted"
        }
      >
        {active ? "Brand Mode Active" : "Brand Mode Off"}
      </div>
      <div className="status-pill border-electric/20 bg-electric/10 text-electric">{profileName}</div>
      <div className="status-pill capitalize">{tone}</div>
    </div>
  );
}
