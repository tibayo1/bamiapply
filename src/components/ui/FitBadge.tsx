import { cn } from "@/lib/utils";
import type { FitRecommendation } from "@/types/application";

interface FitBadgeProps {
  recommendation: FitRecommendation;
  score?: number;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Fit answers: "Should I pursue this?"
 * Visual family: tinted pill + ascending signal bars.
 * The bars carry the level without colour; the label is always shown.
 * (Status is a different family — glyph + plain text, no tinted pill.)
 */
const fit: Record<
  FitRecommendation,
  { level: 0 | 1 | 2 | 3; pill: string; bars: string; description: string }
> = {
  "Strong Apply": {
    level: 3,
    pill: "bg-success-subtle text-success",
    bars: "bg-success",
    description: "Strong fit. Recommended to apply.",
  },
  Apply: {
    level: 2,
    pill: "bg-brand-subtle text-brand",
    bars: "bg-brand",
    description: "Good fit. Worth applying.",
  },
  Stretch: {
    level: 1,
    pill: "bg-warning-subtle text-warning",
    bars: "bg-warning",
    description: "Partial fit. A stretch.",
  },
  Skip: {
    level: 0,
    pill: "bg-danger-subtle text-danger",
    bars: "bg-danger",
    description: "Weak fit. Consider skipping.",
  },
};

function SignalBars({ level, color }: { level: number; color: string }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-[1px]",
            i === 1 ? "h-1" : i === 2 ? "h-2" : "h-3",
            i <= level ? color : "bg-current opacity-25"
          )}
        />
      ))}
    </span>
  );
}

export function FitBadge({ recommendation, score, size = "sm", className }: FitBadgeProps) {
  const config = fit[recommendation];

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md",
        size === "lg" ? "h-8 gap-2 rounded-lg px-3 text-body" : "h-6 gap-1.5 px-2 text-meta",
        config.pill,
        className
      )}
      title={config.description}
    >
      <SignalBars level={config.level} color={config.bars} />
      <span className="font-semibold">{recommendation}</span>
      {score !== undefined && (
        <>
          <span className="sr-only">, match score</span>
          <span className="tabular-nums font-normal opacity-70">{score}%</span>
        </>
      )}
    </span>
  );
}
