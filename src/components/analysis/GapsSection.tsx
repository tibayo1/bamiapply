import { AlertOctagon, Minus } from "lucide-react";
import type { JobRequirement, CriticalIssue } from "@/types/analysis";

interface GapsSectionProps {
  requirements: JobRequirement[];
  criticalIssues: CriticalIssue[];
  onAddExperience?: (requirement: JobRequirement) => void;
}

const importanceOrder = { critical: 0, core: 1, preferred: 2, contextual: 3 };

function EvidenceGapRow({
  requirement,
  onAddExperience,
}: {
  requirement: JobRequirement;
  onAddExperience?: GapsSectionProps["onAddExperience"];
}) {
  const needsConfirmation = requirement.evidenceStrength === "needs_confirmation";

  return (
    <li className="rounded-lg bg-inset/60 p-3 border border-line/60 flex flex-col justify-between">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-body font-medium text-ink">
            {requirement.label}
          </h4>
          <span className="font-mono text-micro text-ink-muted uppercase">
            {requirement.importance} · {requirement.category}
          </span>
        </div>
        <span className="inline-flex rounded bg-warning-subtle px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-warning shrink-0">
          {needsConfirmation ? "Needs verification" : requirement.evidenceStrength === "none" ? "Not linked" : "Related evidence"}
        </span>
      </div>

      <p className="mt-2 text-meta text-ink-secondary leading-snug">
        {needsConfirmation
          ? "The linked Profile information still needs confirmation before it can support this requirement."
          : requirement.rationale ||
            (requirement.evidenceStrength === "none"
              ? "No verified Profile evidence is linked to this requirement. Link a confirmed record or claim that supports it."
              : "The linked evidence partly supports this requirement. Review what it demonstrates and which parts remain unsupported.")}
      </p>

      {onAddExperience && (
        <button
          type="button"
          onClick={() => onAddExperience(requirement)}
          className="focus-ring transition-ui mt-2 text-meta font-medium text-brand hover:text-brand-hover self-start inline-flex items-center gap-1"
        >
          + Add experience or confirmation
        </button>
      )}
    </li>
  );
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

  // Surface important non-critical support gaps first without changing the assessment.
  const manageableGaps = requirements
    .filter(
      (r) =>
        r.importance !== "critical" &&
        (r.evidenceStrength === "none" || r.evidenceStrength === "needs_confirmation" || r.evidenceStrength === "partial") &&
        !r.userOverride?.confirmed
    )
    .sort((a, b) =>
      importanceOrder[a.importance] - importanceOrder[b.importance] ||
      Number(a.evidenceStrength === "partial") - Number(b.evidenceStrength === "partial")
    );
  const visibleGaps = manageableGaps.slice(0, 3);
  const remainingGaps = manageableGaps.slice(3);

  if (blockers.length === 0 && manageableGaps.length === 0) return null;

  return (
    <section aria-labelledby="gaps-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              Evidence to review
            </h3>
            <span className="font-mono text-micro text-ink-muted">
              {manageableGaps.length} items
            </span>
          </div>

          <p className="mt-2.5 text-meta text-ink-muted">
            These requirements have no linked verified evidence, information awaiting confirmation, or only related evidence. Review the support for core requirements first; this list does not prove you lack the experience.
          </p>

          <ul className="mt-4 space-y-3">
            {visibleGaps.map((requirement) => (
              <EvidenceGapRow
                key={requirement.id}
                requirement={requirement}
                onAddExperience={onAddExperience}
              />
            ))}
          </ul>

          {remainingGaps.length > 0 && (
            <details className="mt-3 rounded-lg border border-line">
              <summary className="focus-ring cursor-pointer rounded-lg px-3 py-2.5 text-meta font-medium text-brand transition-ui hover:bg-inset/60">
                View all evidence gaps ({manageableGaps.length})
              </summary>
              <ul className="space-y-3 p-3 pt-0">
                {remainingGaps.map((requirement) => (
                  <EvidenceGapRow
                    key={requirement.id}
                    requirement={requirement}
                    onAddExperience={onAddExperience}
                  />
                ))}
              </ul>
            </details>
          )}
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
                      {issue.category} · {issue.isHardBlocker ? "Non-negotiable" : "Eligibility condition"}
                    </span>
                  </div>
                  <span className="inline-flex rounded bg-danger text-white px-2 py-0.5 font-mono text-[0.6875rem] font-semibold shrink-0">
                    {issue.status === "unmet" ? issue.isHardBlocker ? "Hard blocker" : "Unmet" : "Needs confirmation"}
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
