import clsx from "clsx";

interface OperatorMetricCardProps {
  label: string;
  value: number | string;
  detail: string;
  tone?: "default" | "accent" | "success" | "warning" | "error";
}

const toneStyles = {
  default: "border-white/8 bg-black/20",
  accent: "border-electric/20 bg-electric/10",
  success: "border-emerald-400/20 bg-emerald-400/10",
  warning: "border-warning/30 bg-warning/10",
  error: "border-danger/30 bg-danger/10",
};

export function OperatorMetricCard({
  label,
  value,
  detail,
  tone = "default",
}: OperatorMetricCardProps) {
  return (
    <article className={clsx("rounded-[28px] border p-5", toneStyles[tone])}>
      <p className="field-label">{label}</p>
      <p className="metric-value mt-3">{value}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}
