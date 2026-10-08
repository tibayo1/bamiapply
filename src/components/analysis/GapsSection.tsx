import { AlertOctagon, Minus } from "lucide-react";
import type { JobRequirement, CriticalIssue } from "@/types/analysis";

interface GapsSectionProps {
  requirements: JobRequirement[];
  criticalIssues: CriticalIssue[];
  onAddExperience?: (requirement: JobRequirement) => void;
}

export function GapsSection({
  requirements,
  criticalIssues,
  onAddExperience,
}: GapsSectionProps) {
  // Potential blockers
  const blockers = criticalIssues.filter(
    (issue) => issue.status === "unmet" || issue.status === "needs_confirmation"
  );

  // Manageable gaps: non-critical requirements with partial or no evidence
  const manageableGaps = requirements.filter(
    (r) =>
      r.importance !== "critical" &&
      (r.evidenceStrength === "none" || r.evidenceStrength === "partial") &&
      !r.userOverride?.confirmed
  );

  if (blockers.length === 0 && manageableGaps.length === 0) return null;

  return (
    <section aria-labelledby="gaps-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-warning">
            <span className="font-bold text-warning mr-0.5">/</span>
            AREAS TO ADDRESS
          </div>
          <h2 id="gaps-heading" className="mt-1 text-heading font-semibold text-ink">
            Gaps to consider
          </h2>
        </div>
        <p className="text-meta text-ink-muted">
          Distinguishing non-fatal gaps from true blockers
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Manageable Gaps */}
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-body font-semibold text-ink flex items-center gap-2">
              <Minus className="h-4 w-4 text-warning" />
              Manageable gaps
            </h3>
            <span className="font-mono text-micro text-ink-muted">
              {manageableGaps.length} items
            </span>
          </div>

          <p className="mt-2.5 text-meta text-ink-muted">
            These are useful preferred or adjacent skills that do not disqualify you. Frame these through related experience.
          </p>

          <ul className="mt-4 space-y-3">
            {manageableGaps.map((req) => (
              <li
                key={req.id}
                className="rounded-lg bg-inset/60 p-3 border border-line/60 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-body font-medium text-ink">
                      {req.label}
                    </h4>
                    <span className="font-mono text-micro text-ink-muted uppercase">
                      {req.importance} · {req.category}
                    </span>
                  </div>
                  <span className="inline-flex rounded bg-warning-subtle px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-warning shrink-0">
                    {req.evidenceStrength === "none" ? "No evidence found" : "Partial match"}
                  </span>
                </div>

                <p className="mt-2 text-meta text-ink-secondary leading-snug">
                  {req.rationale ||
                    (req.evidenceStrength === "none"
                      ? `Bámi could not find ${req.label} in your Career Profile.`
                      : "Related academic work found, but lacks commercial device trial exposure.")}
                </p>

                {onAddExperience && (
                  <button
                    type="button"
                    onClick={() => onAddExperience(req)}
                    className="focus-ring transition-ui mt-2 text-meta font-medium text-brand hover:text-brand-hover self-start inline-flex items-center gap-1"
                  >
                    + Add experience or confirmation
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Potential Blockers */}
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-body font-semibold text-ink flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-danger" />
              Potential blockers
            </h3>
            <span className="font-mono text-micro text-ink-muted">
              {blockers.length} items
            </span>
          </div>

          <p className="mt-2.5 text-meta text-ink-muted">
            Non-negotiable requirements where lack of eligibility could cause an immediate rejection.
          </p>

          <ul className="mt-4 space-y-3">
            {blockers.map((issue) => (
              <li
                key={issue.id}
                className="rounded-lg bg-danger-subtle/30 p-3 border border-danger-line/60 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-body font-medium text-ink">
                      {issue.label}
                    </h4>
                    <span className="font-mono text-micro text-ink-muted uppercase">
                      {issue.category} · Non-negotiable
                    </span>
                  </div>
                  <span className="inline-flex rounded bg-danger text-white px-2 py-0.5 font-mono text-[0.6875rem] font-semibold shrink-0">
                    {issue.status === "unmet" ? "Hard blocker" : "Needs confirmation"}
                  </span>
                </div>

                <p className="mt-2 text-meta text-danger leading-snug">
                  {issue.message}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
