import Link from "next/link";
import { ArrowRight, Check, MapPin, Minus } from "lucide-react";
import { FitBadge } from "@/components/ui/FitBadge";
import { mockJobAnalysis as a } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";

/**
 * AnalysisPreview — the landing page's integrated product visual.
 * Designed as an authentic, high-density analysis console rather than a generic card.
 * Features the / JOB ANALYSIS and / BÁMI'S TAKE editorial motifs.
 */
export function AnalysisPreview() {
  return (
    <div
      aria-label="Sample job analysis preview"
      className="w-full overflow-hidden rounded-xl border border-line bg-surface text-left shadow-preview"
    >
      {/* Top console bar with editorial label and status */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/70 px-4 py-2.5 sm:px-6 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink shrink-0">
            <span className="font-bold text-brand mr-1">/</span>
            JOB ANALYSIS
          </span>
          <span className="hidden sm:inline text-line-strong">·</span>
          <span className="hidden sm:inline font-mono text-micro text-ink-muted uppercase tracking-wider truncate">
            OPP-0842 · Bonaduz
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-0.5 font-mono text-[0.6875rem] font-medium text-success shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          EVALUATED
        </span>
      </div>

      <div className="p-4 sm:p-7 space-y-6">
        {/* Role & Company + Fit Score Lockup */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 min-w-0">
          <div className="flex items-start gap-3.5 min-w-0">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-inset text-meta font-semibold tracking-wide text-ink-secondary"
            >
              {getInitials(a.company)}
            </span>
            <div className="min-w-0">
              <p className="text-meta font-medium text-ink-secondary uppercase tracking-wider font-mono">
                {a.company}
              </p>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-ink leading-snug break-words">
                {a.role}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-meta text-ink-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{a.location}</span>
              </p>
            </div>
          </div>

          {/* Prominent Match Assessment */}
          <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t border-line sm:border-t-0 shrink-0 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-semibold tabular-nums text-ink tracking-tight">
                {a.fitScore}%
              </span>
              <span className="text-meta text-ink-muted font-mono uppercase">match</span>
            </div>
            <FitBadge recommendation={a.recommendation} size="sm" />
          </div>
        </div>

        {/* Assessment summary bar */}
        <div className="border-t border-line pt-4">
          <p className="text-body font-medium text-ink">
            {a.summary}
          </p>
        </div>

        {/* Strong matches & Potential gaps — dual column editorial grid */}
        <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-line min-w-0">
          {/* Matches */}
          <div className="min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-mono text-micro font-semibold uppercase tracking-wider text-success">
                Strong matches
              </span>
              <span className="font-mono text-micro text-ink-muted">
                4 verified
              </span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {a.strongMatches.map((item) => (
                <li key={item} className="flex items-start gap-2 text-meta text-ink">
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          <div className="min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-mono text-micro font-semibold uppercase tracking-wider text-warning">
                Potential gaps
              </span>
              <span className="font-mono text-micro text-ink-muted">
                2 items
              </span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {a.potentialGaps.map((item) => (
                <li key={item} className="flex items-start gap-2 text-meta text-ink">
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning">
                    <Minus className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bámi's Take callout with acute diagonal accent */}
        <div className="rounded-lg bg-inset border-l-2 border-brand p-3.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-brand shrink-0">
              <span className="font-bold text-brand mr-1">/</span>
              BÁMI&apos;S TAKE
            </span>
            <span className="font-mono text-[0.6875rem] text-ink-muted uppercase truncate">
              Positioning Analysis
            </span>
          </div>
          <p className="mt-2 text-body font-medium text-ink leading-relaxed">
            &ldquo;{a.take}&rdquo;
          </p>
        </div>
      </div>

      {/* Footer action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-line bg-canvas/70 px-4 py-3.5 sm:px-6 min-w-0">
        <span className="text-meta text-ink-muted leading-relaxed">
          Based on verified career history.
        </span>
        <Link
          href="/dashboard"
          className="focus-ring transition-ui group inline-flex items-center gap-1.5 rounded-sm text-meta font-semibold text-brand hover:text-brand-hover self-start sm:self-auto shrink-0"
        >
          <span>View full analysis</span>
          <ArrowRight
            className="transition-ui h-3.5 w-3.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
