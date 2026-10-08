import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions (wrap below the title on narrow screens). */
  actions?: React.ReactNode;
  /** Small eyebrow above the title. */
  eyebrow?: React.ReactNode;
  className?: string;
}

/** PageHeader — the one H1 on every app page. */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-body text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
