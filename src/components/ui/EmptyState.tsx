import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Small icon. Omit to use the Bámi brand mark. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** One action. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — small mark, clear title, one sentence, one action.
 * No illustrations.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {Icon ? (
        <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-inset text-ink-muted">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      ) : (
        <BrandMark size={28} className="mb-4 opacity-90" />
      )}
      <p className="text-heading font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-body text-ink-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
