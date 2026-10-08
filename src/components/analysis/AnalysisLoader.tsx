"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Reading the role" },
  { id: 2, label: "Identifying critical requirements" },
  { id: 3, label: "Comparing your experience" },
  { id: 4, label: "Checking gaps and eligibility" },
  { id: 5, label: "Building recommendation" },
];

interface AnalysisLoaderProps {
  role: string;
  company: string;
  onComplete?: () => void;
  /** Duration in ms, defaults to 2800ms */
  duration?: number;
}

export function AnalysisLoader({
  role,
  company,
  onComplete,
  duration = 2600,
}: AnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const stepDuration = duration / (STEPS.length + 0.5);

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete?.();
          }, 400);
          return prev;
        }
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center py-16 sm:py-24 text-center"
    >
      {/* Acute brand loader motif */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="accent-slash h-5 w-1 animate-pulse" style={{ animationDelay: "0ms" }} />
        <span className="accent-slash h-6 w-1 animate-pulse" style={{ animationDelay: "150ms" }} />
        <span className="accent-slash h-5 w-1 animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>

      <div className="mt-6">
        <span className="font-mono text-micro font-semibold uppercase tracking-wider text-brand">
          / JOB EVALUATION IN PROGRESS
        </span>
        <h2 className="mt-2 text-title font-semibold text-ink">
          Analysing opportunity
        </h2>
        <p className="mt-1 text-body text-ink-secondary">
          <span className="font-medium text-ink">{role}</span> · {company}
        </p>
      </div>

      {/* Structured multi-step progress list */}
      <div className="mt-8 w-full max-w-sm rounded-xl border border-line bg-surface p-5 text-left shadow-sm">
        <ul className="space-y-3.5" aria-label="Analysis pipeline steps">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isPending = step.id > currentStep;

            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-3 text-meta transition-colors duration-200",
                  isCompleted && "text-ink font-medium",
                  isCurrent && "text-brand font-semibold",
                  isPending && "text-ink-muted/60"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
                    isCompleted && "bg-success-subtle text-success",
                    isCurrent && "bg-brand-subtle text-brand",
                    isPending && "bg-inset text-ink-muted/50"
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 stroke-[3]" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 text-meta text-ink-muted">
        Evaluating requirements against your verified profile history…
      </p>
    </div>
  );
}
