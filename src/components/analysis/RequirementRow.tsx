"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  HelpCircle,
  Minus,
  Plus,
  Quote,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobRequirement } from "@/types/analysis";

interface RequirementRowProps {
  requirement: JobRequirement;
  onAddExperience?: (requirement: JobRequirement) => void;
}

export function RequirementRow({
  requirement: r,
  onAddExperience,
}: RequirementRowProps) {
  const [expanded, setExpanded] = useState(false);

  const hasOverride = r.userOverride?.confirmed;
  const strength = hasOverride ? "strong" : r.evidenceStrength;

  const isStrong = strength === "strong";
  const isPartial = strength === "partial";
  const isNone = strength === "none";
  const isNeedsConf = strength === "needs_confirmation";

  return (
    <div
      className={cn(
        "rounded-xl border transition-ui",
        expanded ? "border-line-strong bg-surface shadow-sm" : "border-line bg-surface/70 hover:bg-surface"
      )}
    >
      {/* Row Header (Clickable / Accessible Button) */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="focus-ring flex w-full items-start sm:items-center justify-between gap-3 p-4 sm:p-5 text-left rounded-xl"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {/* Status Icon */}
          <span
            className={cn(
              "mt-0.5 sm:mt-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isStrong && "bg-success-subtle text-success",
              isPartial && "bg-warning-subtle text-warning",
              isNone && "bg-inset text-ink-muted",
              isNeedsConf && "bg-brand-subtle text-brand"
            )}
            aria-hidden="true"
          >
            {isStrong ? (
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : isPartial ? (
              <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : isNeedsConf ? (
              <HelpCircle className="h-3.5 w-3.5 stroke-[2]" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-ink-muted/60" />
            )}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-semibold text-ink">
                {r.label}
              </span>

              {/* Importance badge */}
              <span
                className={cn(
                  "inline-flex rounded px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider",
                  r.importance === "critical" && "bg-danger-subtle text-danger",
                  r.importance === "core" && "bg-inset text-ink-secondary",
                  r.importance === "preferred" && "bg-inset text-ink-muted",
                  r.importance === "contextual" && "bg-inset text-ink-muted"
                )}
              >
                {r.importance}
              </span>

              {/* Category */}
              <span className="hidden sm:inline font-mono text-micro text-ink-muted">
                · {r.category}
              </span>
            </div>

            {/* Sub-label preview */}
            <p className="mt-0.5 text-meta text-ink-secondary line-clamp-1">
              {r.description || r.sourceText}
            </p>
          </div>
        </div>

        {/* Right side: Match state badge and toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider",
              isStrong && "bg-success-subtle text-success",
              isPartial && "bg-warning-subtle text-warning",
              isNone && "bg-inset text-ink-muted",
              isNeedsConf && "bg-brand-subtle text-brand"
            )}
          >
            {isStrong
              ? "Strong Match"
              : isPartial
              ? "Partial Match"
              : isNeedsConf
              ? "Needs confirmation"
              : "No evidence found"}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-muted transition-transform duration-200",
              expanded && "rotate-180 text-ink"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Expanded Details Drawer */}
      {expanded && (
        <div className="border-t border-line px-4 pb-5 pt-4 sm:px-6 space-y-4 text-left">
          {/* Source Text from Employer if present */}
          {r.sourceText && (
            <div className="rounded-lg bg-inset/50 p-3 border border-line/60">
              <span className="font-mono text-micro uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-1">
                <Quote className="h-3 w-3 text-brand" />
                Employer requirement wording
              </span>
              <p className="text-meta text-ink italic leading-relaxed">
                &ldquo;{r.sourceText}&rdquo;
              </p>
            </div>
          )}

          {/* Evidence from Candidate Profile */}
          {r.evidence && r.evidence.length > 0 ? (
            <div className="space-y-2.5">
              <span className="font-mono text-micro uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 font-semibold">
                <Sparkles className="h-3 w-3 text-brand" />
                Verified evidence from your career profile
              </span>

              {r.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg bg-surface border border-line p-3.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-meta">
                    <span className="font-semibold text-ink">
                      {ev.sourceTitle}
                      {ev.sourceOrganization && (
                        <span className="font-normal text-ink-muted">
                          {" "}· {ev.sourceOrganization}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-micro uppercase text-ink-muted">
                      {ev.sourceType}
                    </span>
                  </div>

                  <p className="mt-2 text-body text-ink-secondary leading-relaxed">
                    {ev.evidenceText}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-inset/70 p-4 border border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-body font-medium text-ink">
                  Bámi could not find {r.label} in your Career Profile.
                </p>
                <p className="mt-0.5 text-meta text-ink-muted">
                  This does not necessarily mean you lack this experience. If you have this background, you can add it or confirm it.
                </p>
              </div>

              {onAddExperience && (
                <button
                  type="button"
                  onClick={() => onAddExperience(r)}
                  className="focus-ring transition-ui inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:border-brand hover:text-brand shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  I have this experience
                </button>
              )}
            </div>
          )}

          {/* Rationale or nuance if present */}
          {r.rationale && (
            <p className="text-meta text-ink-secondary bg-surface p-2.5 rounded-md border border-line/60">
              <strong className="text-ink font-semibold">Bámi note:</strong>{" "}
              {r.rationale}
            </p>
          )}

          {/* User confirmation override notice if applied */}
          {hasOverride && (
            <p className="text-meta text-success font-medium">
              ✓ You confirmed having this experience for this evaluation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
