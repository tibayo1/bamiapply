import { Check, Minus } from "lucide-react";

interface FitSignalsProps {
  matches: string[];
  gaps: string[];
  /** Unique prefix for heading ids when rendered more than once. */
  idPrefix?: string;
}

/**
 * FitSignals — "Strong matches" and "Potential gaps".
 * The sub-labels ("Backed by your career profile" / "Not found in your
 * profile") plant the evidence idea that verified vs unsupported claims
 * will build on later.
 */
export function FitSignals({ matches, gaps, idPrefix = "fit" }: FitSignalsProps) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
      <section aria-labelledby={`${idPrefix}-matches`}>
        <h3 id={`${idPrefix}-matches`} className="flex items-baseline gap-2 text-body font-semibold text-ink">
          Strong matches
          <span className="text-meta font-normal tabular-nums text-ink-muted">{matches.length}</span>
        </h3>
        <p className="mt-0.5 text-meta text-ink-muted">Backed by your career profile</p>
        <ul className="mt-4 space-y-3">
          {matches.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-body text-ink">
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${idPrefix}-gaps`}>
        <h3 id={`${idPrefix}-gaps`} className="flex items-baseline gap-2 text-body font-semibold text-ink">
          Potential gaps
          <span className="text-meta font-normal tabular-nums text-ink-muted">{gaps.length}</span>
        </h3>
        <p className="mt-0.5 text-meta text-ink-muted">Not found in your profile yet</p>
        <ul className="mt-4 space-y-3">
          {gaps.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-body text-ink">
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning">
                <Minus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
