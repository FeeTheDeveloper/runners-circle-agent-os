import {
  AtSign,
  BriefcaseBusiness,
  Camera,
  Clapperboard,
  Globe2,
  Mail,
  Music2,
} from "lucide-react";
import clsx from "clsx";
import type { DistributionChannel } from "@/lib/types/distribution";

interface ChannelIconProps {
  channel: DistributionChannel;
  className?: string;
}

const iconClassName =
  "inline-flex size-10 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-foreground";

export function ChannelIcon({ channel, className }: ChannelIconProps) {
  const Icon =
    channel === "instagram"
      ? Camera
      : channel === "tiktok"
        ? Music2
        : channel === "youtube_shorts"
          ? Clapperboard
          : channel === "x"
            ? AtSign
            : channel === "linkedin"
              ? BriefcaseBusiness
              : channel === "email"
                ? Mail
                : Globe2;

  return (
    <span className={clsx(iconClassName, className)}>
      <Icon className="size-4" />
    </span>
  );
}
