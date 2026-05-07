"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { agentRegistry } from "@/lib/agents/registry";
import { GenerationResult } from "@/components/studio/generation-result";
import { aspectRatios, videoDurations, videoFormats, type GenerationResponse, type GenerationResult as GenerationResultData, type GenerationType, type ImageGenerationInput, type VideoGenerationInput } from "@/lib/types/generation";

interface PromptPanelProps {
  mode: GenerationType;
  title: string;
  description: string;
  defaultPrompt: string;
}

interface PromptPanelShellProps {
  mode: GenerationType;
  title: string;
  description: string;
  children: React.ReactNode;
  result: GenerationResultData | null;
  errorMessage: string | null;
  isSubmitting: boolean;
}

const imageStyles = [
  "Editorial speed",
  "Product hero realism",
  "Campaign poster energy",
  "Technical lifestyle",
] as const;

const motionStyles = [
  "Cinematic sprint",
  "Pulse graphics",
  "Retail motion loop",
  "Performance launch trailer",
] as const;

const imageAgents = agentRegistry.filter((agent) => agent.acceptedTaskTypes.includes("generate_image_prompt"));
const videoAgents = agentRegistry.filter((agent) => agent.acceptedTaskTypes.includes("generate_video_prompt"));
const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-orange/40";

function getDefaultAgentId(mode: GenerationType, ids: string[]) {
  const preferred = mode === "image" ? "image-generation" : "video-generation";

  return ids.includes(preferred) ? preferred : ids[0] ?? "";
}

async function requestGeneration(
  endpoint: string,
  payload: ImageGenerationInput | VideoGenerationInput,
): Promise<GenerationResponse<GenerationResultData>> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as GenerationResponse<GenerationResultData>;

  if (!response.ok && body.success) {
    return {
      success: false,
      error: {
        message: "Unexpected generation response.",
        code: "INTERNAL_ERROR",
      },
    };
  }

  return body;
}

function PromptPanelShell({ mode, title, description, children, result, errorMessage, isSubmitting }: PromptPanelShellProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Direct Generation</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>
          </div>
          <div className="rounded-2xl border border-orange/20 bg-orange/10 p-3 text-orange-soft">
            <Sparkles className="size-5" />
          </div>
        </div>

        <div className="mt-6">{children}</div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted">
            {mode === "image"
              ? "Image generation returns a mock completed asset contract while the live media layer is still offline."
              : "Video generation returns a queued job contract so render workers can be added later without changing the UI shape."}
          </p>
          <Link
            href="/agents"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft"
          >
            View agent registry
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>

      <GenerationResult mode={mode} result={result} errorMessage={errorMessage} isSubmitting={isSubmitting} />
    </div>
  );
}

function BrandModeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-orange/30"
    >
      <div>
        <p className="text-sm font-medium text-foreground">Brand mode</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Applies the premium athletic-tech tone for Runners Circle Agent OS.
        </p>
      </div>
      <div
        className={
          enabled
            ? "rounded-full border border-orange/20 bg-orange/10 px-3 py-1 text-xs font-semibold text-orange-soft"
            : "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-muted"
        }
      >
        {enabled ? "On" : "Off"}
      </div>
    </button>
  );
}

function ImagePromptPanel({ title, description, defaultPrompt }: Omit<PromptPanelProps, "mode">) {
  const [form, setForm] = useState<ImageGenerationInput>({
    prompt: defaultPrompt,
    style: imageStyles[0],
    aspectRatio: "4:5",
    brandMode: true,
    agentId: getDefaultAgentId("image", imageAgents.map((agent) => agent.id)),
  });
  const [result, setResult] = useState<GenerationResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await requestGeneration("/api/generate/image", form);

      if (!response.success) {
        setErrorMessage(response.error.message);
        return;
      }

      setResult(response.data);
    } catch {
      setErrorMessage("Unable to submit the image generation contract right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PromptPanelShell
      mode="image"
      title={title}
      description={description}
      result={result}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label htmlFor="image-prompt" className="field-label">
            Prompt
          </label>
          <textarea
            id="image-prompt"
            rows={7}
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            className={fieldClassName}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="image-style" className="field-label">
              Style
            </label>
            <select
              id="image-style"
              value={form.style}
              onChange={(event) => setForm((current) => ({ ...current, style: event.target.value }))}
              className={fieldClassName}
            >
              {imageStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="image-ratio" className="field-label">
              Aspect ratio
            </label>
            <select
              id="image-ratio"
              value={form.aspectRatio}
              onChange={(event) =>
                setForm((current) => ({ ...current, aspectRatio: event.target.value as ImageGenerationInput["aspectRatio"] }))
              }
              className={fieldClassName}
            >
              {aspectRatios.map((aspectRatio) => (
                <option key={aspectRatio} value={aspectRatio}>
                  {aspectRatio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="image-agent" className="field-label">
            Selected agent
          </label>
          <select
            id="image-agent"
            value={form.agentId}
            onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}
            className={fieldClassName}
          >
            {imageAgents.map((agent) => (
              <option key={agent.id} value={agent.id} disabled={agent.status === "offline"}>
                {agent.name} · {agent.status}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-muted">Busy agents can still receive queued work. Offline agents are blocked.</p>
        </div>

        <BrandModeToggle enabled={form.brandMode} onToggle={() => setForm((current) => ({ ...current, brandMode: !current.brandMode }))} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Generating mock image..." : "Generate image"}
        </button>
      </form>
    </PromptPanelShell>
  );
}

function VideoPromptPanel({ title, description, defaultPrompt }: Omit<PromptPanelProps, "mode">) {
  const [form, setForm] = useState<VideoGenerationInput>({
    prompt: defaultPrompt,
    motionStyle: motionStyles[0],
    duration: 15,
    format: "vertical",
    brandMode: true,
    agentId: getDefaultAgentId("video", videoAgents.map((agent) => agent.id)),
  });
  const [result, setResult] = useState<GenerationResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await requestGeneration("/api/generate/video", form);

      if (!response.success) {
        setErrorMessage(response.error.message);
        return;
      }

      setResult(response.data);
    } catch {
      setErrorMessage("Unable to submit the video generation contract right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PromptPanelShell
      mode="video"
      title={title}
      description={description}
      result={result}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label htmlFor="video-prompt" className="field-label">
            Prompt
          </label>
          <textarea
            id="video-prompt"
            rows={7}
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            className={fieldClassName}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="video-motion-style" className="field-label">
              Motion style
            </label>
            <select
              id="video-motion-style"
              value={form.motionStyle}
              onChange={(event) => setForm((current) => ({ ...current, motionStyle: event.target.value }))}
              className={fieldClassName}
            >
              {motionStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="video-agent" className="field-label">
              Selected agent
            </label>
            <select
              id="video-agent"
              value={form.agentId}
              onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}
              className={fieldClassName}
            >
              {videoAgents.map((agent) => (
                <option key={agent.id} value={agent.id} disabled={agent.status === "offline"}>
                  {agent.name} · {agent.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="video-duration" className="field-label">
              Duration
            </label>
            <select
              id="video-duration"
              value={form.duration}
              onChange={(event) =>
                setForm((current) => ({ ...current, duration: Number(event.target.value) as VideoGenerationInput["duration"] }))
              }
              className={fieldClassName}
            >
              {videoDurations.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} seconds
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="video-format" className="field-label">
              Format
            </label>
            <select
              id="video-format"
              value={form.format}
              onChange={(event) =>
                setForm((current) => ({ ...current, format: event.target.value as VideoGenerationInput["format"] }))
              }
              className={fieldClassName}
            >
              {videoFormats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
        </div>

        <BrandModeToggle enabled={form.brandMode} onToggle={() => setForm((current) => ({ ...current, brandMode: !current.brandMode }))} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Queueing mock video job..." : "Generate video"}
        </button>
      </form>
    </PromptPanelShell>
  );
}

export function PromptPanel({ mode, title, description, defaultPrompt }: PromptPanelProps) {
  if (mode === "image") {
    return <ImagePromptPanel title={title} description={description} defaultPrompt={defaultPrompt} />;
  }

  return <VideoPromptPanel title={title} description={description} defaultPrompt={defaultPrompt} />;
}
