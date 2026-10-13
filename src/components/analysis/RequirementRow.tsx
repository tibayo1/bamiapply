"use client";

import { useId, useState } from "react";
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
import { evidenceVerificationLabel, isVerifiedProfileEvidence } from "@/lib/analysis/presentation";
import type { CandidateEvidence, JobRequirement } from "@/types/analysis";

interface RequirementRowProps {
  requirement: JobRequirement;
  onAddExperience?: (requirement: JobRequirement) => void;
}

export function RequirementRow({
  requirement: r,
  onAddExperience,
}: RequirementRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const hasOverride = r.userOverride !== undefined;
  const strength = r.userOverride?.confirmed ? "strong" : r.evidenceStrength;
  const isCritical = r.importance === "critical";
  const verifiedEvidence = (r.evidence ?? []).filter(isVerifiedProfileEvidence);
  const unverifiedCount = (r.evidence ?? []).filter(
    (item) => Boolean(item.link) && !isVerifiedProfileEvidence(item)
  ).length;
  const hasVerifiedEvidence = verifiedEvidence.length > 0;
  // Saved labels are never rewritten. Older sentence-length labels are only
  // shortened for the collapsed view; full wording remains in the drawer.
  const label = r.label.length > 104
    ? `${r.label.slice(0, 101).replace(/\s+\S*$/, "").trim()}…`
    : r.label;
  const evidenceSummary = hasVerifiedEvidence
    ? `${verifiedEvidence.length} linked verified evidence ${verifiedEvidence.length === 1 ? "item" : "items"}`
    : unverifiedCount > 0
    ? `${unverifiedCount} linked ${unverifiedCount === 1 ? "item needs" : "items need"} verification · none verified`
    : "No linked verified evidence";

  const isStrong = isCritical
    ? r.criticalStatus === "satisfied"
    : strength === "strong" && (hasVerifiedEvidence || hasOverride);
  const isPartial = !isCritical && strength === "partial" && hasVerifiedEvidence;
  const isNeedsConf = isCritical
    ? r.criticalStatus === undefined || r.criticalStatus === "needs_confirmation"
    : !hasVerifiedEvidence && (unverifiedCount > 0 || strength === "needs_confirmation");
  const isNone = !isStrong && !isPartial && !isNeedsConf;
  const matchLabel = hasOverride
    ? r.userOverride?.confirmed ? "Self-reported match" : "Self-reported unmet"
    : isCritical
    ? r.criticalStatus === "satisfied" ? "Gate satisfied" : r.criticalStatus === "unmet" ? "Gate unmet" : "Gate unconfirmed"
    : isStrong ? "Direct evidence" : isPartial ? "Related evidence" : isNeedsConf ? "Needs verification" : "Not linked";

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
        aria-controls={expanded ? detailsId : undefined}
        className="focus-ring flex w-full flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 text-left rounded-xl"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {/* Status Icon */}
          <span
            className={cn(
              "mt-0.5 sm:mt-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isStrong && !hasOverride && "bg-success-subtle text-success",
              hasOverride && "bg-warning-subtle text-warning",
              isPartial && !hasOverride && "bg-warning-subtle text-warning",
              isNone && !hasOverride && "bg-inset text-ink-muted",
              isNeedsConf && !hasOverride && "bg-brand-subtle text-brand"
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
              <span className="text-body font-semibold text-ink break-words">
                {label}
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

            <p className="mt-1 text-meta text-ink-secondary">
              {evidenceSummary}
            </p>
          </div>
        </div>

        {/* Right side: Match state badge and toggle */}
        <div className="flex w-full sm:w-auto items-center justify-between gap-3 shrink-0 pl-9 sm:pl-0">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider",
              isStrong && !hasOverride && "bg-success-subtle text-success",
              hasOverride && "bg-warning-subtle text-warning",
              isPartial && !hasOverride && "bg-warning-subtle text-warning",
              isNone && !hasOverride && "bg-inset text-ink-muted",
              isNeedsConf && !hasOverride && "bg-brand-subtle text-brand"
            )}
          >
            {matchLabel}
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

      {hasOverride && (
        <p className="px-4 pb-3 sm:px-5 text-micro text-ink-muted">
          What-if assessment · Career Profile unchanged
        </p>
      )}

      {/* Expanded Details Drawer */}
      {expanded && (
        <div id={detailsId} className="border-t border-line px-4 pb-5 pt-4 sm:px-6 space-y-4 text-left">
          {label !== r.label && r.label !== r.sourceText && (
            <h3 className="text-body font-semibold text-ink">{r.label}</h3>
          )}
          {r.description && r.description !== r.label && r.description !== r.sourceText && (
            <p className="text-meta text-ink-secondary">{r.description}</p>
          )}
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
            <RequirementEvidenceList evidence={r.evidence} />
          ) : (
            <div className="rounded-lg bg-inset/70 p-4 border border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-body font-medium text-ink">
                  {isCritical ? "Eligibility is assessed separately from experience evidence." : "No verified Profile evidence is linked to this requirement."}
                </p>
                <p className="mt-0.5 text-meta text-ink-muted">
                  {isCritical
                    ? "Review the underlying eligibility facts in Career Profile. The gate status above does not create a verified experience claim."
                    : "This is an evidence gap in the assessment, not proof that you lack the experience. Add or confirm relevant facts in Career Profile, then link them to this requirement."}
                </p>
              </div>

              {onAddExperience && !isCritical && (
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
            <p className="text-meta text-ink-secondary font-medium">
              {r.userOverride?.note}
              {" "}This self-reported override applies only to this assessment;
              it is not verified Profile evidence.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Keep each evidence item's verification status visible in the drawer. */
export function RequirementEvidenceList({ evidence }: { evidence: CandidateEvidence[] }) {
  return (
    <div className="space-y-2.5">
      <span className="font-mono text-micro uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 font-semibold">
        <Sparkles className="h-3 w-3 text-brand" />
        Evidence from your Career Profile
      </span>
      {evidence.map((item) => (
        <div key={item.id} className="rounded-lg bg-surface border border-line p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3 text-meta">
            <span className="font-semibold text-ink">
              {item.sourceTitle}
              {item.sourceOrganization && (
                <span className="font-normal text-ink-muted"> · {item.sourceOrganization}</span>
              )}
            </span>
            <span className="font-mono text-micro uppercase text-ink-muted">{item.sourceType}</span>
          </div>
          <span className={cn(
            "mt-1 inline-flex font-mono text-micro",
            isVerifiedProfileEvidence(item) ? "text-success" : "text-warning"
          )}>
            {evidenceVerificationLabel(item)}
          </span>
          <p className="mt-2 text-body text-ink-secondary leading-relaxed">{item.evidenceText}</p>
        </div>
      ))}
    </div>
  );
}
