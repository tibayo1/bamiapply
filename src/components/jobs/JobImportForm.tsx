"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useJobs } from "@/lib/jobs/context";
import { createRequirementDraft, getJobEvidenceOptions, suggestJobRequirementsDetailed, MAX_JOB_DESCRIPTION_LENGTH, MAX_JOB_REQUIREMENTS } from "@/lib/jobs/ingestion";
import { useProfile } from "@/lib/profile/context";
import type { JobDraftInput, JobRequirementDraft } from "@/types/job";
import type { JobPosting } from "@/types/analysis";
import { JobRequirementEditor, jobFieldClass } from "./JobRequirementEditor";

const EMPTY_INPUT: JobDraftInput = { company: "", role: "", location: "", sourceUrl: "", rawDescription: "", requirements: [] };
const labelClass = "block text-meta font-medium text-ink";

/** A reviewed job starts here. Persistence and final validation belong to JobsProvider. */
export function JobImportForm({ sourceJob }: { sourceJob?: JobPosting }) {
  const router = useRouter();
  const prefix = useId();
  const { profile, isHydrated: profileHydrated, canPersist: profileCanPersist } = useProfile();
  const jobs = useJobs();
  const [input, setInput] = useState<JobDraftInput>(() => sourceJob ? {
    company: sourceJob.company, role: sourceJob.role, location: sourceJob.location,
    sourceUrl: sourceJob.sourceUrl ?? "", rawDescription: sourceJob.rawDescription ?? "", requirements: [],
  } : EMPTY_INPUT);
  const [step, setStep] = useState<"details" | "requirements">("details");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [omittedCount, setOmittedCount] = useState(0);
  const ready = profileHydrated && jobs.isHydrated;
  const canSave = ready && profileCanPersist && jobs.canPersist;
  const evidenceOptions = profileHydrated ? getJobEvidenceOptions(profile) : [];

  function updateInput(patch: Partial<JobDraftInput>) {
    setInput((current) => ({ ...current, ...patch }));
    setReviewConfirmed(false);
    setError(null);
  }

  function updateRequirement(next: JobRequirementDraft) {
    setInput((current) => ({ ...current, requirements: current.requirements.map((requirement) => requirement.id === next.id ? next : requirement) }));
    setReviewConfirmed(false);
    setError(null);
  }

  function startReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.company.trim() || !input.role.trim() || !input.rawDescription.trim()) {
      setError("Add the company, role, and original job description before reviewing requirements.");
      return;
    }
    if (input.rawDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      setError("Use a job description of 30,000 characters or fewer.");
      return;
    }
    // Returning to the source never silently replaces manually reviewed requirements.
    if (input.requirements.length === 0) {
      const suggestions = suggestJobRequirementsDetailed(input.rawDescription);
      setOmittedCount(suggestions.omittedCount);
      setInput((current) => ({ ...current, requirements: suggestions.requirements.length ? suggestions.requirements : [createRequirementDraft()] }));
    }
    setReviewConfirmed(false);
    setError(null);
    setStep("requirements");
  }

  function analyzeJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewConfirmed) {
      setError("Confirm that you reviewed the requirements and evidence links before continuing.");
      return;
    }
    if (!canSave) {
      setError("Saving is paused. Resolve the workspace storage notice before analyzing this job. Your draft is still here.");
      return;
    }
    const result = jobs.importJob(input, profile);
    if (!result.id || result.error) {
      setError(result.error ?? "This job could not be saved. Your draft is still here.");
      return;
    }
    router.push(`/analysis/${encodeURIComponent(result.id)}`);
  }

  return (
    <div className="mt-5">
      {sourceJob ? <p className="mb-4 text-meta text-ink-secondary">You are creating a new review of this posting. Previously saved jobs and application analyses stay unchanged.</p> : null}
      {!ready ? <p role="status" className="text-meta text-ink-muted">Loading your Career Profile and reviewed jobs…</p> : null}
      {ready && !canSave ? <p role="status" className="mb-4 rounded-md border border-warning-line bg-warning-subtle p-3 text-meta text-warning">Saving is paused while your workspace storage needs attention. Your job draft remains on this page.</p> : null}
      {error ? <p role="alert" className="mb-4 rounded-md border border-danger-line bg-danger-subtle p-3 text-meta text-danger">{error}</p> : null}

      {step === "details" ? (
        <form onSubmit={startReview}>
          <fieldset disabled={!ready} className="min-w-0 space-y-4 disabled:opacity-60">
            <legend className="sr-only">Job details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${prefix}-company`} className={labelClass}>Company <span className="text-danger">*</span></label>
                <input id={`${prefix}-company`} required maxLength={200} value={input.company} onChange={(event) => updateInput({ company: event.target.value })} autoComplete="organization" placeholder="Employer name" className={jobFieldClass} />
              </div>
              <div>
                <label htmlFor={`${prefix}-role`} className={labelClass}>Role <span className="text-danger">*</span></label>
                <input id={`${prefix}-role`} required maxLength={200} value={input.role} onChange={(event) => updateInput({ role: event.target.value })} placeholder="Job title" className={jobFieldClass} />
              </div>
              <div>
                <label htmlFor={`${prefix}-location`} className={labelClass}>Location (optional)</label>
                <input id={`${prefix}-location`} maxLength={200} value={input.location} onChange={(event) => updateInput({ location: event.target.value })} placeholder="e.g. Istanbul or remote" className={jobFieldClass} />
              </div>
              <div>
                <label htmlFor={`${prefix}-url`} className={labelClass}>Job posting link (optional)</label>
                <input id={`${prefix}-url`} type="url" maxLength={2000} value={input.sourceUrl} onChange={(event) => updateInput({ sourceUrl: event.target.value })} placeholder="https://…" className={jobFieldClass} aria-describedby={`${prefix}-url-help`} />
                <p id={`${prefix}-url-help`} className="mt-1 text-micro text-ink-muted">Kept as a source reference. Paste the description below.</p>
              </div>
            </div>
            <div>
              <label htmlFor={`${prefix}-description`} className={labelClass}>Original job description <span className="text-danger">*</span></label>
              <textarea id={`${prefix}-description`} required rows={7} maxLength={MAX_JOB_DESCRIPTION_LENGTH} value={input.rawDescription} onChange={(event) => updateInput({ rawDescription: event.target.value })} placeholder="Paste the employer's job description, including responsibilities, qualifications, and eligibility conditions." className={jobFieldClass} aria-describedby={`${prefix}-description-help`} />
              <p id={`${prefix}-description-help`} className="mt-1 text-micro text-ink-muted">The original posting is kept with the analysis. {input.rawDescription.length.toLocaleString()} / 30,000 characters.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg">{input.requirements.length ? "Continue requirement review" : "Review requirements"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              <span className="text-micro text-ink-muted">You review the requirements before any analysis is saved.</span>
            </div>
          </fieldset>
        </form>
      ) : (
        <form onSubmit={analyzeJob}>
          <fieldset disabled={!ready} className="min-w-0 disabled:opacity-60">
            <legend className="sr-only">Review job requirements</legend>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-heading font-semibold text-ink">Review requirements for {input.role}</h3>
                <p className="mt-1 text-meta text-ink-secondary">{input.company}{input.location ? ` · ${input.location}` : ""}</p>
              </div>
              <Button variant="secondary" onClick={() => { setStep("details"); setReviewConfirmed(false); setError(null); }}>Edit job details</Button>
            </div>
            <p className="mt-4 text-body text-ink-secondary">Review the suggested capabilities and qualifications against the original posting. Headings, company descriptions and benefits are excluded. Check the importance and link verified Career Profile evidence that demonstrates each requirement.</p>
            <p className="mt-2 text-meta text-ink-muted">Evidence is linked by you during review. An unlinked requirement means the match has not been established; it does not mean you lack the experience.</p>
            <p className="mt-2 text-meta text-ink-muted">Include at least one core requirement. Keep non-negotiable eligibility conditions as critical gates. Suggestions come from the posting&apos;s text and may need correction.</p>
            {omittedCount > 0 ? <p role="status" className="mt-3 rounded-md border border-warning-line bg-warning-subtle p-3 text-meta text-warning">This posting produced more than 30 suggestions. {omittedCount} are not shown; eligibility gates were prioritised. Check the full posting and replace lower-priority items with any missing essential requirements before continuing.</p> : null}
            <details className="mt-4 rounded-md border border-line bg-inset p-3">
              <summary className="cursor-pointer text-meta font-medium text-ink">View original job description</summary>
              <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-meta text-ink-secondary">{input.rawDescription}</p>
            </details>
            <div className="mt-5 space-y-5">
              {input.requirements.map((requirement, index) => <JobRequirementEditor key={requirement.id} requirement={requirement} index={index} evidenceOptions={evidenceOptions} onChange={updateRequirement} onRemove={() => updateInput({ requirements: input.requirements.filter((item) => item.id !== requirement.id) })} />)}
            </div>
            {input.requirements.length === 0 ? <p className="mt-4 text-meta text-warning">Add at least one core requirement from the original posting.</p> : null}
            <Button variant="secondary" className="mt-4" disabled={input.requirements.length >= MAX_JOB_REQUIREMENTS} onClick={() => updateInput({ requirements: [...input.requirements, createRequirementDraft()] })}><Plus className="h-4 w-4" aria-hidden="true" />Add requirement</Button>
            <p className="mt-2 text-micro text-ink-muted">{input.requirements.length} / 30 requirements</p>
            <div className="mt-6 rounded-lg border border-brand-line bg-brand-subtle p-4">
              <label htmlFor={`${prefix}-review`} className="flex items-start gap-3 text-body text-ink">
                <input id={`${prefix}-review`} type="checkbox" checked={reviewConfirmed} onChange={(event) => { setReviewConfirmed(event.target.checked); setError(null); }} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
                <span>I reviewed these requirements against the original posting and checked the evidence links.</span>
              </label>
              <p className="ml-7 mt-2 text-meta text-ink-secondary">Fit is calculated from the importance you reviewed and the verified Profile evidence you linked. Selecting evidence does not change your Profile or confirm new candidate facts.</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={!canSave || !reviewConfirmed || input.requirements.length === 0}>Analyze job<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              <span className="text-meta text-ink-muted">Saves this reviewed posting in your browser workspace.</span>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
