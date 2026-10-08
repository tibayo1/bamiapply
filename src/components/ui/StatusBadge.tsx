import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/application";

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

/** Pie-style progress glyph: ring + filled wedge (fraction 0–1). */
function PieGlyph({ fraction, className }: { fraction: number; className?: string }) {
  const r = 5;
  const angle = fraction * Math.PI * 2;
  const x = 8 + r * Math.sin(angle);
  const y = 8 - r * Math.cos(angle);
  const large = fraction > 0.5 ? 1 : 0;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d={`M8 8 L8 ${8 - r} A${r} ${r} 0 ${large} 1 ${x} ${y} Z`} fill="currentColor" />
    </svg>
  );
}

type Glyph = (cls: string) => React.ReactNode;

/**
 * Status answers: "Where am I in the process?"
 * Visual family: round progress glyph + plain label, no tinted pill.
 * The glyph shape changes with progress, so it is readable without colour.
 */
const statusConfig: Record<ApplicationStatus, { glyph: Glyph; color: string }> = {
  Saved: { color: "text-ink-muted", glyph: (c) => <CircleDashed className={c} aria-hidden="true" /> },
  Preparing: { color: "text-brand", glyph: (c) => <PieGlyph fraction={0.25} className={c} /> },
  "Ready to Apply": { color: "text-brand", glyph: (c) => <PieGlyph fraction={0.5} className={c} /> },
  Applied: { color: "text-info", glyph: (c) => <PieGlyph fraction={0.5} className={c} /> },
  Assessment: { color: "text-info", glyph: (c) => <PieGlyph fraction={0.7} className={c} /> },
  Interview: { color: "text-info", glyph: (c) => <PieGlyph fraction={0.85} className={c} /> },
  Offer: { color: "text-success", glyph: (c) => <CircleCheck className={c} aria-hidden="true" /> },
  Rejected: { color: "text-danger", glyph: (c) => <CircleX className={c} aria-hidden="true" /> },
  Withdrawn: { color: "text-ink-muted", glyph: (c) => <CircleMinus className={c} aria-hidden="true" /> },
  Skipped: { color: "text-ink-muted", glyph: (c) => <CircleMinus className={c} aria-hidden="true" /> },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { glyph, color } = statusConfig[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-meta text-ink", className)}>
      <span className={cn("flex", color)}>{glyph("h-3.5 w-3.5 shrink-0")}</span>
      <span>{status}</span>
    </span>
  );
}
