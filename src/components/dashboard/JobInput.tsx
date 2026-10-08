"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardPaste, Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/Button";

type Mode = "link" | "text";

interface JobInputProps {
  /** Called with the pasted link or description. Wired to the analysis API later. */
  onAnalyse?: (input: { mode: Mode; value: string }) => void;
}

/**
 * JobInput — the dashboard's primary action.
 * One strong input surface, with the action integrated into it. Not a
 * chat box: no avatar, no message framing, no streaming affordances.
 */
export function JobInput({ onAnalyse }: JobInputProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("link");
  const [value, setValue] = useState("");

  const hasValue = value.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasValue) return;
    onAnalyse?.({ mode, value: value.trim() });
    router.push("/analysis/hamilton-medical-001?simulate=true");
  }

  function switchMode() {
    setMode((m) => (m === "link" ? "text" : "link"));
    setValue("");
  }

  return (
    <section
      id="job-input"
      aria-labelledby="job-input-heading"
      className="scroll-mt-6 rounded-xl border border-line bg-surface p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 text-micro font-medium text-brand">
        <span className="accent-slash" aria-hidden="true" />
        Job analysis
      </p>
      <h2 id="job-input-heading" className="mt-2 text-heading font-semibold text-ink">
        What opportunity are you considering?
      </h2>
      <p className="mt-1 max-w-prose text-body text-ink-secondary">
        Paste a job link or job description and {brand.displayName} will help you decide whether
        it&apos;s worth applying.
      </p>

      <form onSubmit={submit} className="mt-5">
        <div
          className={cn(
            "transition-ui rounded-lg border border-line-strong bg-canvas",
            "focus-within:border-brand focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand/20",
            mode === "link"
              ? "flex flex-col gap-2 p-1.5 sm:flex-row sm:items-center sm:pl-3.5"
              : "flex flex-col"
          )}
        >
          {mode === "link" ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 sm:px-0">
                <Link2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                  }}
                  placeholder="Paste a job URL or job description..."
                  aria-label="Job URL or description"
                  className="h-11 min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-muted focus:outline-none sm:h-10"
                />
              </div>
              <Button type="submit" size="lg" disabled={!hasValue} className="w-full sm:h-10 sm:w-auto">
                Analyse job
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <textarea
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                }}
                rows={7}
                placeholder="Paste the full job description here…"
                aria-label="Job description"
                className="min-h-40 w-full resize-y bg-transparent px-4 py-3.5 text-body text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3 border-t border-line p-1.5">
                <span className="pl-2.5 text-micro text-ink-muted tabular-nums">
                  {value.trim() ? `${value.trim().split(/\s+/).length} words` : ""}
                </span>
                <Button type="submit" size="md" disabled={!hasValue}>
                  Analyse job
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={switchMode}
            className="focus-ring transition-ui -ml-1 inline-flex h-8 items-center gap-1.5 self-start rounded-md px-1 text-meta font-medium text-ink-secondary hover:text-ink"
          >
            {mode === "link" ? (
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {mode === "link" ? "Paste description manually" : "Use a job link instead"}
          </button>
          <p className="text-meta text-ink-muted">
            You&apos;ll see your fit, strengths and gaps before you spend time on an application.
          </p>
        </div>
      </form>
    </section>
  );
}
