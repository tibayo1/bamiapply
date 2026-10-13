import { CheckCircle2 } from "lucide-react";
import type { JobRequirement } from "@/types/analysis";
import { getVerifiedCoreStrengths } from "@/lib/analysis/presentation";

interface StrengthsSectionProps {
  requirements: JobRequirement[];
}

export function StrengthsSection({ requirements }: StrengthsSectionProps) {
  const strongCore = getVerifiedCoreStrengths(requirements);

  if (strongCore.length === 0) return null;

  return (
    <section aria-labelledby="strengths-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            PROVEN CAPABILITIES
          </div>
          <h2 id="strengths-heading" className="mt-1 text-heading font-semibold text-ink">
            Your strongest advantages
          </h2>
        </div>
        <span className="font-mono text-micro text-success font-medium">
          {strongCore.length} verified proof points
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {strongCore.map(({ requirement: req, evidence }) => {
          return (
            <div
              key={req.id}
              className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-ui hover:border-line-strong flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-body font-semibold text-ink leading-snug">
                      {req.label}
                    </h3>
                    <span className="font-mono text-micro text-ink-muted uppercase tracking-wider">
                      {req.category} · Core requirement
                    </span>
                  </div>
                </div>

                {evidence && (
                  <p className="mt-3 text-meta text-ink-secondary leading-relaxed bg-inset/60 rounded-lg p-2.5 border border-line/50">
                    &ldquo;{evidence.evidenceText}&rdquo;
                  </p>
                )}
              </div>

              {evidence && (
                <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between font-mono text-[0.6875rem] text-ink-muted">
                  <span className="truncate">{evidence.sourceTitle}</span>
                  <span className="truncate">{evidence.sourceOrganization}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
