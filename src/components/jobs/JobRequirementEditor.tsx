"use client";

import { useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { linkKey, type ResolvedEvidence } from "@/lib/profile/evidence";
import type { RequirementCategory, RequirementImportance, RequirementMatch } from "@/types/analysis";
import type { JobRequirementDraft } from "@/types/job";

export const jobFieldClass = "mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none";
const labelClass = "block text-meta font-medium text-ink";

const categories: { value: RequirementCategory; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "experience", label: "Experience" },
  { value: "skill", label: "Skill" },
  { value: "industry", label: "Industry knowledge" },
  { value: "language", label: "Language" },
  { value: "location", label: "Location" },
  { value: "work_authorization", label: "Work authorization" },
  { value: "certification", label: "Certification" },
  { value: "license", label: "License" },
  { value: "seniority", label: "Seniority" },
  { value: "other", label: "Other" },
];

interface JobRequirementEditorProps {
  requirement: JobRequirementDraft;
  index: number;
  evidenceOptions: ResolvedEvidence[];
  onChange: (requirement: JobRequirementDraft) => void;
  onRemove: () => void;
}

/** Employer wording stays editable; candidate evidence is selected by stable Profile links. */
export function JobRequirementEditor({ requirement, index, evidenceOptions, onChange, onRemove }: JobRequirementEditorProps) {
  const prefix = useId();
  const isWorkAuthorization = requirement.category === "work_authorization";
  const isEligibility = isWorkAuthorization && requirement.importance === "critical";
  const selectedKeys = new Set(requirement.profileMatches.map((match) => linkKey(match.link)));
  const availableEvidence = evidenceOptions.filter((option) => !selectedKeys.has(linkKey(option.link)));

  function update(patch: Partial<JobRequirementDraft>) {
    onChange({ ...requirement, ...patch });
  }

  function updateMatch(key: string, relevance: RequirementMatch["relevance"]) {
    update({ profileMatches: requirement.profileMatches.map((match) => linkKey(match.link) === key ? { ...match, relevance } : match) });
  }

  return (
    <fieldset className="min-w-0 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <legend className="px-1 text-meta font-semibold text-ink">Requirement {index + 1}</legend>
      <div className="flex items-start justify-between gap-3">
        <p className="text-meta text-ink-muted">What does the employer ask for?</p>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove requirement ${index + 1}`}>Remove</Button>
      </div>
      <div className="mt-3">
        <label htmlFor={`${prefix}-label`} className={labelClass}>Requirement label</label>
        <input id={`${prefix}-label`} required maxLength={300} value={requirement.label} onChange={(event) => update({ label: event.target.value })} placeholder="e.g. Experience designing research studies" className={jobFieldClass} />
      </div>
      <div className="mt-4">
        <label htmlFor={`${prefix}-source`} className={labelClass}>Original wording from the posting</label>
        <textarea id={`${prefix}-source`} required maxLength={3000} rows={2} value={requirement.sourceText} onChange={(event) => update({ sourceText: event.target.value })} className={jobFieldClass} aria-describedby={`${prefix}-source-help`} />
        <p id={`${prefix}-source-help`} className="mt-1 text-micro text-ink-muted">Copy the employer&apos;s exact wording so you can trace this requirement back to the job description.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-importance`} className={labelClass}>Importance</label>
          <select id={`${prefix}-importance`} value={requirement.importance} onChange={(event) => {
            const importance = event.target.value as RequirementImportance;
            update({ importance, isHardBlocker: importance === "critical" && requirement.isHardBlocker });
          }} className={jobFieldClass}>
            <option value="core">Core — central to the role</option>
            <option value="preferred">Preferred — useful extra</option>
            <option value="contextual">Contextual — wider alignment</option>
            <option value="critical">Critical — separate eligibility gate</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${prefix}-category`} className={labelClass}>Category</label>
          <select id={`${prefix}-category`} value={requirement.category} onChange={(event) => {
            const category = event.target.value as RequirementCategory;
            update(category === "work_authorization"
              ? { category, importance: "critical", isHardBlocker: true, profileMatches: [] }
              : { category });
          }} className={jobFieldClass}>
            {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </div>
      </div>

      {isWorkAuthorization && !isEligibility ? <p className="mt-3 text-meta text-warning">If this is a required right-to-work condition, choose Critical so it is checked as a separate eligibility gate. Remove general sponsorship information if it is not a requirement.</p> : null}

      {requirement.importance === "critical" ? (
        <div className="mt-4 rounded-md border border-warning-line bg-warning-subtle p-3">
          <label htmlFor={`${prefix}-blocker`} className="flex items-start gap-2 text-meta text-ink">
            <input id={`${prefix}-blocker`} type="checkbox" checked={requirement.isHardBlocker} onChange={(event) => update({ isHardBlocker: event.target.checked })} className="mt-0.5 accent-brand" />
            <span>This is a non-negotiable eligibility requirement in the posting.</span>
          </label>
          <p className="mt-2 text-micro text-ink-secondary">Critical requirements are checked separately from the fit percentage.</p>
        </div>
      ) : null}

      {isEligibility ? (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor={`${prefix}-regions`} className={labelClass}>Accepted countries or regions</label>
            <input id={`${prefix}-regions`} required maxLength={500} value={requirement.acceptedRegions} onChange={(event) => update({ acceptedRegions: event.target.value })} placeholder="e.g. Switzerland, EU, EFTA" className={jobFieldClass} aria-describedby={`${prefix}-regions-help`} />
            <p id={`${prefix}-regions-help`} className="mt-1 text-micro text-ink-muted">Use only regions stated by the employer. Separate them with commas.</p>
          </div>
          <div>
            <label htmlFor={`${prefix}-sponsorship`} className={labelClass}>Employer visa sponsorship</label>
            <select id={`${prefix}-sponsorship`} value={requirement.sponsorship} onChange={(event) => update({ sponsorship: event.target.value as JobRequirementDraft["sponsorship"] })} className={jobFieldClass}>
              <option value="unknown">Not stated / needs confirmation</option>
              <option value="available">Available according to the posting</option>
              <option value="unavailable">Unavailable according to the posting</option>
            </select>
          </div>
          <p className="text-meta text-ink-secondary">Your work authorization is read from your Career Profile. This form records the employer&apos;s conditions.</p>
        </div>
      ) : (
        <div className="mt-5 border-t border-line pt-4">
          <label htmlFor={`${prefix}-evidence`} className={labelClass}>Link verified Profile evidence (optional)</label>
          <select id={`${prefix}-evidence`} value="" onChange={(event) => {
            const option = availableEvidence.find((item) => linkKey(item.link) === event.target.value);
            if (option) update({ profileMatches: [...requirement.profileMatches, { link: { ...option.link }, relevance: "direct" }] });
          }} className={jobFieldClass} disabled={availableEvidence.length === 0}>
            <option value="">{evidenceOptions.length === 0 ? "No verified evidence available" : availableEvidence.length === 0 ? "All available evidence linked" : "Choose a verified record or claim"}</option>
            {availableEvidence.map((option) => <option key={linkKey(option.link)} value={linkKey(option.link)}>{option.recordTitle} — {option.excerpt.length > 120 ? `${option.excerpt.slice(0, 120)}…` : option.excerpt}</option>)}
          </select>
          <p className="mt-1 text-micro text-ink-muted">Choose evidence that supports this requirement. Leave it unlinked if your Profile does not establish a match.</p>
          <p className="mt-1 text-micro text-ink-muted">Direct or adjacent describes your assessment of how the selected evidence relates to the employer&apos;s requirement.</p>
          {evidenceOptions.length === 0 ? <p className="mt-2 text-meta text-ink-secondary">Confirm relevant facts in your <Link href="/profile" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">Career Profile</Link> before linking them here.</p> : null}
          <div className="mt-3 space-y-3">
            {requirement.profileMatches.map((match, matchIndex) => {
              const key = linkKey(match.link);
              const option = evidenceOptions.find((item) => linkKey(item.link) === key);
              return (
                <div key={key} className="rounded-md border border-line bg-inset p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-meta font-medium text-ink">{option?.recordTitle ?? "Evidence needs review"}</p>
                      {option ? <p className="mt-1 whitespace-pre-wrap break-words text-meta text-ink-secondary">{option.excerpt}</p> : <p className="mt-1 text-meta text-warning">This evidence is no longer verified or available in your Profile. Remove it or confirm it before continuing.</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => update({ profileMatches: requirement.profileMatches.filter((item) => linkKey(item.link) !== key) })} aria-label={`Remove evidence ${matchIndex + 1} from requirement ${index + 1}`}>Remove</Button>
                  </div>
                  <label htmlFor={`${prefix}-match-${matchIndex}`} className={`mt-3 ${labelClass}`}>How does this evidence support the requirement?</label>
                  <select id={`${prefix}-match-${matchIndex}`} value={match.relevance} onChange={(event) => updateMatch(key, event.target.value as RequirementMatch["relevance"])} className={jobFieldClass}>
                    <option value="direct">Direct — demonstrates the requirement</option>
                    <option value="adjacent">Adjacent — related, partly covers it</option>
                  </select>
                  {option ? <Link href={option.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-micro font-medium text-brand underline underline-offset-2">View source in Career Profile</Link> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </fieldset>
  );
}
