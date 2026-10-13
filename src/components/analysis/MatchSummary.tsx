import { HelpCircle, ShieldCheck } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import type { JobAnalysis } from "@/types/analysis";
import { summarizeEligibility } from "@/lib/analysis/presentation";

interface MatchSummaryProps {
  analysis: JobAnalysis;
}

export function MatchSummary({ analysis }: MatchSummaryProps) {
  const { coreFit, preferredFit, contextualFit, evidenceCoverage, confidence, requirements } = analysis;

  const coreTotal = requirements.filter((r) => r.importance === "core").length;
  const coreSupported = requirements.filter(
    (r) =>
      r.importance === "core" &&
      (r.evidenceStrength === "strong" || r.evidenceStrength === "partial" || r.userOverride?.confirmed)
  ).length;

  const prefTotal = requirements.filter((r) => r.importance === "preferred").length;
  const prefSupported = requirements.filter(
    (r) =>
      r.importance === "preferred" &&
      (r.evidenceStrength === "strong" || r.evidenceStrength === "partial" || r.userOverride?.confirmed)
  ).length;

  const contTotal = requirements.filter((r) => r.importance === "contextual").length;
  const contSupported = requirements.filter(
    (r) =>
      r.importance === "contextual" &&
      (r.evidenceStrength === "strong" || r.evidenceStrength === "partial" || r.userOverride?.confirmed)
  ).length;

  const eligibility = summarizeEligibility(analysis.criticalIssues);
  const hasOverrides = requirements.some((r) => r.userOverride !== undefined);

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-line">
        <div>
          <h3 className="text-body font-semibold text-ink">
            Assessment breakdown
          </h3>
          <p className="mt-0.5 text-meta text-ink-muted">
            {hasOverrides
              ? "Weighted evaluation uses verified profile evidence and local self-reported overrides."
              : "Weighted evaluation based on verified profile history."}
          </p>
        </div>

        {/* Confidence pill */}
        <Tooltip
          label={
            confidence === "High"
              ? "High confidence: Most requirement determinations are complete, with no unresolved critical criteria."
              : confidence === "Medium"
              ? "Medium confidence: Some requirements need confirmation before final determination."
              : "Low confidence: Much of the profile or requirement information needs confirmation."
          }
          side="left"
        >
          <div className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-inset px-3 py-1 text-meta text-ink-secondary self-start sm:self-auto cursor-help">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            <span className="font-mono text-micro font-medium uppercase tracking-wider">
              Confidence:
            </span>
            <span className="font-semibold text-ink">{confidence}</span>
            <HelpCircle className="h-3 w-3 text-ink-muted ml-0.5" />
          </div>
        </Tooltip>
      </div>

      {hasOverrides && (
        <p className="mt-4 rounded-lg border border-line bg-inset p-3 text-meta text-ink-secondary">
          What-if assessment: self-reported overrides affect this analysis only.
          They are not verified Career Profile evidence.
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        {/* Core requirements (70%) */}
        <div className="rounded-lg bg-inset/70 p-3.5 border border-line/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-secondary">
              Core (70%)
            </span>
            <span className="font-mono text-meta font-semibold tabular-nums text-ink">
              {coreFit}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {coreSupported} <span className="text-sm font-normal text-ink-muted">/ {coreTotal}</span>
            </span>
            <span className="text-micro font-mono text-ink-muted">supported</span>
          </div>
          {/* Visual bar */}
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${coreFit}%` }}
            />
          </div>
        </div>

        {/* Preferred requirements (20%) */}
        <div className="rounded-lg bg-inset/70 p-3.5 border border-line/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-secondary">
              Preferred (20%)
            </span>
            <span className="font-mono text-meta font-semibold tabular-nums text-ink">
              {preferredFit}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {prefSupported} <span className="text-sm font-normal text-ink-muted">/ {prefTotal}</span>
            </span>
            <span className="text-micro font-mono text-ink-muted">supported</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-brand/70 transition-all duration-300"
              style={{ width: `${preferredFit}%` }}
            />
          </div>
        </div>

        {/* Contextual requirements (10%) */}
        <div className="rounded-lg bg-inset/70 p-3.5 border border-line/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-secondary">
              Context (10%)
            </span>
            <span className="font-mono text-meta font-semibold tabular-nums text-ink">
              {contextualFit}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {contSupported} <span className="text-sm font-normal text-ink-muted">/ {contTotal}</span>
            </span>
            <span className="text-micro font-mono text-ink-muted">supported</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-brand/50 transition-all duration-300"
              style={{ width: `${contextualFit}%` }}
            />
          </div>
        </div>

        {/* Critical Gate Status */}
        <div className="rounded-lg bg-inset/70 p-3.5 border border-line/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-secondary">
              Eligibility
            </span>
            <span className="font-mono text-micro text-ink-muted">Gate</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-xl font-bold tracking-tight tabular-nums ${eligibility.unmet > 0 ? "text-danger" : eligibility.pending > 0 ? "text-warning" : "text-ink"}`}>
              {eligibility.total === 0
                ? "Not specified"
                : eligibility.unmet > 0
                ? `${eligibility.unmet} unmet`
                : eligibility.pending > 0
                ? `${eligibility.pending} unconfirmed`
                : "Satisfied"}
            </span>
          </div>
          <p className="mt-1 text-micro text-ink-muted leading-tight">
            {eligibility.total === 0
              ? "No critical requirements identified"
              : `${eligibility.satisfied} satisfied · ${eligibility.unmet} unmet · ${eligibility.pending} unconfirmed`}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-micro text-ink-muted font-mono">
        <span>{hasOverrides ? "Assessment coverage including overrides" : "Verified evidence coverage across role"}: {evidenceCoverage}%</span>
        <span>Deterministic calculation · No arbitrary AI score</span>
      </div>
    </div>
  );
}
