import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types/application";

interface ApplicationProgressProps {
  cvStatus: DocumentStatus;
  coverLetterStatus: DocumentStatus;
  questionsCompleted: number;
  questionsTotal: number;
  className?: string;
}

/** Glyph + sr-only text. Shape differs per state, so colour is never the only cue. */
function StateMark({ status }: { status: DocumentStatus }) {
  if (status === "Complete") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
      </span>
    );
  }
  if (status === "In progress") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-warning">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 3 A5 5 0 0 1 8 13 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-line-strong">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Item({
  label,
  status,
  detail,
}: {
  label: string;
  status: DocumentStatus;
  detail?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-meta text-ink-secondary">
      <span>{label}</span>
      {detail ? (
        <span className="tabular-nums font-medium text-ink">{detail}</span>
      ) : (
        <StateMark status={status} />
      )}
      <span className="sr-only">: {status.toLowerCase()}</span>
    </span>
  );
}

/**
 * ApplicationProgress — "CV ✓  Cover letter ✓  Questions 3/5".
 * Compact inline indicators; no progress bar.
 */
export function ApplicationProgress({
  cvStatus,
  coverLetterStatus,
  questionsCompleted,
  questionsTotal,
  className,
}: ApplicationProgressProps) {
  const questionsStatus: DocumentStatus | null =
    questionsTotal === 0
      ? null
      : questionsCompleted >= questionsTotal
        ? "Complete"
        : questionsCompleted > 0
          ? "In progress"
          : "Not started";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-1", className)}>
      <Item label="CV" status={cvStatus} />
      <Item label="Cover letter" status={coverLetterStatus} />
      {questionsStatus && (
        <Item
          label="Questions"
          status={questionsStatus}
          detail={questionsStatus === "Complete" ? undefined : `${questionsCompleted}/${questionsTotal}`}
        />
      )}
    </div>
  );
}
