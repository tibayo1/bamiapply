import { cn } from "@/lib/utils";

interface LoadingIndicatorProps {
  /** Visible text next to the indicator. Also used as the accessible name. */
  label?: string;
  className?: string;
}

/**
 * LoadingIndicator — three diagonal strokes (the Bámi accent) that
 * fade in sequence. The one loading visual for the product.
 * Respects prefers-reduced-motion (see globals.css).
 */
export function LoadingIndicator({ label = "Loading", className }: LoadingIndicatorProps) {
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-2.5 text-meta text-ink-muted", className)}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="accent-slash loader-slash" />
        <span className="accent-slash loader-slash" />
        <span className="accent-slash loader-slash" />
      </span>
      <span>{label}</span>
    </span>
  );
}
