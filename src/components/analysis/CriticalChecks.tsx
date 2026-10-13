"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CriticalIssue } from "@/types/analysis";

interface CriticalChecksProps {
  issues: CriticalIssue[];
  onResolve: (issueId: string, action: "satisfy" | "block" | "unsure") => void;
}

export function CriticalChecks({ issues, onResolve }: CriticalChecksProps) {
  if (issues.length === 0) return null;

  return (
    <section aria-labelledby="critical-checks-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            ELIGIBILITY GATES
          </div>
          <h2
            id="critical-checks-heading"
            className="mt-1 text-heading font-semibold text-ink"
          >
            Before you apply
          </h2>
        </div>
        <span className="font-mono text-micro text-ink-muted">
          Non-negotiable criteria
        </span>
      </div>

      <p className="text-meta text-ink-secondary">
        Choices below create self-reported what-if overrides for this analysis.
        They do not update or verify your Career Profile.
      </p>

      <div className="space-y-3">
        {issues.map((issue) => {
          const isSatisfied = issue.status === "satisfied";
          const isUnmet = issue.status === "unmet";
          const isUnknown = issue.status === "needs_confirmation";

          return (
            <div
              key={issue.id}
              className={cn(
                "rounded-xl border p-4 sm:p-5 transition-ui",
                isSatisfied && "border-success-line/60 bg-success-subtle/30",
                isUnmet && "border-danger-line bg-danger-subtle/50",
                isUnknown && "border-warning-line bg-warning-subtle/40"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                      isSatisfied && "bg-success-subtle text-success",
                      isUnmet && "bg-danger-subtle text-danger",
                      isUnknown && "bg-warning-subtle text-warning"
                    )}
                    aria-hidden="true"
                  >
                    {isSatisfied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isUnmet ? (
                      <AlertOctagon className="h-4 w-4" />
                    ) : (
                      <HelpCircle className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-body font-semibold text-ink">
                        {issue.label}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider",
                          isSatisfied && "bg-success-subtle text-success",
                          isUnmet && "bg-danger text-white",
                          isUnknown && "bg-warning-subtle text-warning"
                        )}
                      >
                        {isSatisfied
                          ? "Satisfied"
                          : isUnmet
                          ? issue.isHardBlocker ? "Hard blocker" : "Unmet"
                          : "Needs confirmation"}
                      </span>
                    </div>

                    <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
                      {issue.message.replace(/^Verified:\s*/, "Assessed: ")}
                    </p>

                    {issue.confirmationQuestion && (
                      <p className="mt-2 text-meta font-medium text-ink">
                        {issue.confirmationQuestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive choice actions */}
              <div className="mt-4 pt-3 border-t border-line/60 flex flex-wrap items-center gap-2">
                <span className="text-micro font-mono uppercase text-ink-muted mr-1">
                  Assess as:
                </span>
                <button
                  type="button"
                  onClick={() => onResolve(issue.id, "satisfy")}
                  className={cn(
                    "focus-ring transition-ui inline-flex h-8 items-center rounded-md px-3 text-meta font-medium",
                    isSatisfied
                      ? "bg-success text-white shadow-sm"
                      : "bg-surface border border-line text-ink hover:border-success hover:text-success"
                  )}
                >
                  {issue.category === "work_authorization" ? "I have authorization" : "I meet this requirement"}
                </button>

                <button
                  type="button"
                  onClick={() => onResolve(issue.id, "block")}
                  className={cn(
                    "focus-ring transition-ui inline-flex h-8 items-center rounded-md px-3 text-meta font-medium",
                    isUnmet
                      ? "bg-danger text-white shadow-sm"
                      : "bg-surface border border-line text-ink hover:border-danger hover:text-danger"
                  )}
                >
                  {issue.category === "work_authorization" ? "I need sponsorship" : "I do not meet this requirement"}
                </button>

                <button
                  type="button"
                  onClick={() => onResolve(issue.id, "unsure")}
                  className={cn(
                    "focus-ring transition-ui inline-flex h-8 items-center rounded-md px-3 text-meta font-medium",
                    isUnknown
                      ? "bg-ink text-canvas shadow-sm"
                      : "bg-surface border border-line text-ink-muted hover:text-ink"
                  )}
                >
                  Not sure
                </button>
              </div>

              {/* Explanatory dynamic feedback */}
              {isUnmet && (
                <div className="mt-3 rounded-lg bg-surface/80 p-3 border border-danger-line/60 text-meta text-danger">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Eligibility assessed as unmet
                  </p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    Eligibility gates are evaluated separately from your fit score.
                    Confirm the underlying facts in Career Profile before applying.
                  </p>
                </div>
              )}

              {isSatisfied && (
                <div className="mt-3 rounded-lg bg-surface/80 p-2.5 border border-success-line/60 text-meta text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Eligibility assessed as satisfied for this analysis.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
