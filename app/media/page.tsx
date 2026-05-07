import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { MediaCard } from "@/components/media/media-card";
import { getMediaAssets, getUserMediaAssets } from "@/lib/services/media-storage";
import { getCurrentProfile } from "@/lib/services/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { MediaAsset } from "@/lib/types/media";

type MediaFilter = "all" | "images" | "videos" | "ready" | "processing";

interface MediaPageProps {
  searchParams: Promise<{
    filter?: string | string[];
  }>;
}

const filterTabs: Array<{ id: MediaFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "ready", label: "Ready" },
  { id: "processing", label: "Processing" },
];

function resolveFilter(input: string | string[] | undefined): MediaFilter {
  const value = Array.isArray(input) ? input[0] : input;

  if (value === "images" || value === "videos" || value === "ready" || value === "processing") {
    return value;
  }

  return "all";
}

function filterAssets(assets: MediaAsset[], filter: MediaFilter) {
  switch (filter) {
    case "images":
      return assets.filter((asset) => asset.type === "image");
    case "videos":
      return assets.filter((asset) => asset.type === "video");
    case "ready":
      return assets.filter((asset) => asset.status === "ready");
    case "processing":
      return assets.filter((asset) => asset.status === "processing");
    default:
      return assets;
  }
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const params = await searchParams;
  const activeFilter = resolveFilter(params.filter);

  const profile = await getCurrentProfile();
  const supabaseReady = isSupabaseConfigured();
  const isAuthenticated = profile.mode === "supabase" && Boolean(profile.user);

  let assets: MediaAsset[];
  let isPersisted: boolean;

  if (supabaseReady && isAuthenticated && profile.user) {
    const persisted = await getUserMediaAssets(profile.user.id);
    if (persisted.length > 0) {
      assets = persisted;
      isPersisted = true;
    } else {
      assets = getMediaAssets();
      isPersisted = false;
    }
  } else {
    assets = getMediaAssets();
    isPersisted = false;
  }

  const filteredAssets = filterAssets(assets, activeFilter);
  const sourceLabel = isPersisted ? "persisted" : "mock";
  const badgeClass = isPersisted
    ? "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : "status-pill border-electric/20 bg-electric/10 text-electric";

  return (
    <AppShell
      eyebrow="Media Library"
      title="Track generated media records and prepare download-ready asset flows."
      description="The Media Library now uses typed mock records and storage-ready contracts so the dashboard can preview assets, filter them by lane, and prepare direct downloads without live Supabase Storage yet."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className={badgeClass}>{sourceLabel}</div>
          <div className="status-pill border-electric/20 bg-electric/10 text-electric">{assets.length} assets</div>
        </div>
      }
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Library Filters</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">Browse by media type or production state.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Use the filter tabs to focus the dashboard on the assets that are ready to ship, still processing, or
              specific to the image or video lanes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {filterTabs.map((tab) => {
              const href = tab.id === "all" ? "/media" : `/media?filter=${tab.id}`;
              const isActive = activeFilter === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={href}
                  className={
                    isActive
                      ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
                      : "status-pill border-white/10 bg-white/[0.04] text-foreground/70"
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5">
        {filteredAssets.length === 0 ? (
          <article className="panel p-6">
            <p className="eyebrow">Empty State</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">No media assets match this filter.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Adjust the filter tabs to return to the full library or narrow the view to another production state.
            </p>
          </article>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredAssets.map((asset) => (
              <MediaCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
