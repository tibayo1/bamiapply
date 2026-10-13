"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Check, FileText, RotateCcw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { CVPreview } from "./CVPreview";
import { CVVersionExport } from "./CVVersionExport";
import { useApplications } from "@/lib/applications/context";
import { getProfileRevision } from "@/lib/profile/revision";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { buildCVContent, getCVCandidates, getDefaultCVSelection, isCVVersionStale } from "@/lib/cv/domain";
import { useProfile } from "@/lib/profile/context";
import { linkKey } from "@/lib/profile/evidence";
import type { ApplicationRecord } from "@/types/application";
import type { CVCandidate, CVSelection, CVVersion } from "@/types/cv";
import type { CareerProfile, EvidenceLink } from "@/types/profile";

const groups: { kind: CVCandidate["kind"]; title: string }[] = [
  { kind: "experience", title: "Experience" },
  { kind: "education", title: "Education" },
  { kind: "research_project", title: "Research & projects" },
  { kind: "achievement", title: "Achievements" },
  { kind: "career_story", title: "Career stories" },
  { kind: "skill", title: "Skills with verified evidence" },
];

function savedDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Starting a new version retains only facts still usable in the live Profile. */
function availableSelection(selection: CVSelection, candidates: CVCandidate[]): CVSelection {
  const evidence = new Set(candidates.flatMap((item) => item.evidenceLink ? [linkKey(item.evidenceLink)] : []));
  const skills = new Set(candidates.flatMap((item) => item.skillId ? [item.skillId] : []));
  return {
    evidence: selection.evidence.filter((item) => evidence.has(linkKey(item))),
    skillIds: selection.skillIds.filter((id) => skills.has(id)),
  };
}

function selectionKey(selection: CVSelection): string {
  return JSON.stringify([selection.evidence.map(linkKey), selection.skillIds]);
}

function CandidateOption({ candidate, checked, onChange }: {
  candidate: CVCandidate;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className={checked ? "rounded-lg border border-brand-line bg-brand-subtle/40 p-3" : "rounded-lg border border-line bg-surface p-3"}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onChange} className="focus-ring mt-1 h-4 w-4 shrink-0 accent-brand" />
        <span className="min-w-0">
          <span className="block break-words text-body font-medium text-ink [overflow-wrap:anywhere]">{candidate.label}</span>
          <span className="mt-1 block whitespace-pre-wrap break-words text-meta leading-relaxed text-ink-secondary">{candidate.text}</span>
        </span>
      </label>
      <div className="ml-7 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {candidate.matchedRequirementLabels.length > 0 ? (
          <span className="min-w-0 break-words text-micro text-brand [overflow-wrap:anywhere]">Linked to: {candidate.matchedRequirementLabels.join(" · ")}</span>
        ) : <span className="text-micro text-ink-muted">Verified supporting fact</span>}
        <Link href={candidate.href} className="focus-ring rounded-sm text-micro font-medium text-brand hover:underline">View in Profile</Link>
      </div>
    </div>
  );
}

function VersionEvidence({ version, job }: { version: CVVersion; job: ApplicationRecord["job"] }) {
  const candidates = getCVCandidates(version.sourceProfile, job);
  const selectedEvidence = new Set(version.selection.evidence.map(linkKey));
  const selectedSkills = new Set(version.selection.skillIds);
  const selected = candidates.filter((item) => item.evidenceLink ? selectedEvidence.has(linkKey(item.evidenceLink)) : item.skillId ? selectedSkills.has(item.skillId) : false);
  return (
    <details className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <summary className="focus-ring cursor-pointer rounded-sm text-body font-medium text-ink">Evidence used in this version ({selected.length})</summary>
      <p className="mt-3 text-meta text-ink-muted">These facts were verified when this version was saved. Their original Profile references remain attached to the document.</p>
      <ul className="mt-4 space-y-3">
        {selected.map((item) => (
          <li key={item.id} className="rounded-lg border border-line p-3">
            <p className="break-words text-body font-medium text-ink [overflow-wrap:anywhere]">{item.label}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-meta text-ink-secondary [overflow-wrap:anywhere]">{item.text}</p>
            {item.evidenceLink ? <p className="mt-2 break-all font-mono text-micro text-ink-muted">Record: {item.evidenceLink.recordId}{item.evidenceLink.claimId ? ` · Claim: ${item.evidenceLink.claimId}` : ""}</p> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

function CVWorkspace({ application, profile, canUseProfile }: {
  application: ApplicationRecord;
  profile: CareerProfile;
  canUseProfile: boolean;
}) {
  const { saveCVVersion, canPersist, persistenceIssue } = useApplications();
  const versions = application.cvVersions ?? [];
  const latest = versions.at(-1);
  const candidates = getCVCandidates(profile, application.job);
  const revision = getProfileRevision(profile);
  const [selection, setSelection] = useState<CVSelection>(() => latest
    ? availableSelection(latest.selection, candidates)
    : getDefaultCVSelection(profile, application.job));
  const [view, setView] = useState<"editor" | "history">("editor");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(latest?.id ?? null);
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({});
  const currentSelectionKey = selectionKey(selection);
  const currentReviewKey = JSON.stringify([revision, currentSelectionKey]);
  const reviewed = reviewedKey === currentReviewKey;
  const content = buildCVContent(profile, selection);
  const liveSelection = availableSelection(selection, candidates);
  const unavailable = selection.evidence.length + selection.skillIds.length - liveSelection.evidence.length - liveSelection.skillIds.length;
  const selectedEvidence = new Set(selection.evidence.map(linkKey));
  const selectedSkills = new Set(selection.skillIds);
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? latest;
  const dirty = !latest || isCVVersionStale(latest, profile) || selectionKey(latest.selection) !== currentSelectionKey;
  const verifiedIdentity = profile.personal.verificationStatus === "verified" && profile.personal.name.trim().length > 0;
  const canSave = canPersist && canUseProfile && !!content && content.sections.length > 0 && unavailable === 0;
  const criticalIssues = buildJobAnalysis({ profile, job: application.job }).criticalIssues.filter((issue) => issue.status !== "satisfied");

  function updateSelection(next: CVSelection) {
    setSelection(next);
    setReviewedKey(null);
    setFeedback({});
  }

  function toggle(candidate: CVCandidate) {
    if (candidate.evidenceLink) {
      const candidateKey = linkKey(candidate.evidenceLink);
      updateSelection({ ...selection, evidence: selectedEvidence.has(candidateKey)
        ? selection.evidence.filter((item) => linkKey(item) !== candidateKey)
        : [...selection.evidence, candidate.evidenceLink] });
    } else if (candidate.skillId) {
      updateSelection({ ...selection, skillIds: selectedSkills.has(candidate.skillId)
        ? selection.skillIds.filter((id) => id !== candidate.skillId)
        : [...selection.skillIds, candidate.skillId] });
    }
  }

  function moveEvidence(index: number, delta: number) {
    const evidence: EvidenceLink[] = [...selection.evidence];
    const target = index + delta;
    if (target < 0 || target >= evidence.length) return;
    [evidence[index], evidence[target]] = [evidence[target], evidence[index]];
    updateSelection({ ...selection, evidence });
  }

  function startNewVersion(version?: CVVersion) {
    updateSelection(version ? availableSelection(version.selection, candidates) : getDefaultCVSelection(profile, application.job));
    setView("editor");
  }

  function save(status: CVVersion["status"]) {
    if (!canSave || (status === "reviewed" && !reviewed)) return;
    const result = saveCVVersion(application.id, profile, selection, status);
    if (result.error || !result.id) {
      setFeedback({ error: result.error ?? "The CV was not saved. Please try again." });
      return;
    }
    setSelectedVersionId(result.id);
    setView("history");
    setReviewedKey(null);
    setFeedback({ message: status === "reviewed" ? "Reviewed CV saved. You can now download it or save it as a PDF." : "Draft saved. Review it before exporting." });
  }

  return (
    <PageContainer width="wide" className="space-y-6">
      <Link href={`/applications/${application.id}`} className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-meta font-medium text-ink-secondary hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to application
      </Link>
      <PageHeader title="Tailored CV" description={`${application.role} · ${application.company}`} eyebrow={<p className="mb-2 font-mono text-micro uppercase tracking-wide text-brand">Application preparation</p>} />
      <p className="max-w-prose text-body text-ink-secondary">Choose verified facts from your Career Profile, review the document, then save a version for this application.</p>

      {criticalIssues.length > 0 ? (
        <details className="rounded-lg border border-warning-line bg-warning-subtle p-4">
          <summary className="focus-ring cursor-pointer rounded-sm text-body font-medium text-warning">Eligibility needs attention ({criticalIssues.length})</summary>
          <p className="mt-2 text-meta text-ink-secondary">You can prepare a CV while resolving these gates. Saving a CV does not confirm eligibility or change your application stage.</p>
          <ul className="mt-3 space-y-2 text-meta text-ink-secondary">
            {criticalIssues.map((issue) => <li key={issue.id}><span className="font-medium text-ink">{issue.label}: </span>{issue.message}</li>)}
          </ul>
          <Link href={`/applications/${application.id}`} className="focus-ring mt-3 inline-block rounded-sm text-meta font-medium text-brand hover:underline">Review application eligibility</Link>
        </details>
      ) : null}

      {!canUseProfile || !canPersist ? (
        <p role="alert" className="rounded-lg border border-warning-line bg-warning-subtle p-4 text-meta text-warning">
          {!canUseProfile ? "Profile storage needs attention. Saving and exporting a CV is paused until your Profile can be safely saved." : persistenceIssue ?? "Application storage needs attention. New CV versions cannot be saved yet."}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-line pb-3" aria-label="CV workspace views">
        <Button variant={view === "editor" ? "primary" : "secondary"} aria-pressed={view === "editor"} onClick={() => { setView("editor"); setFeedback({}); }}>Edit current CV</Button>
        <Button variant={view === "history" ? "primary" : "secondary"} aria-pressed={view === "history"} disabled={versions.length === 0} onClick={() => { setView("history"); setFeedback({}); }}>Saved versions ({versions.length})</Button>
      </div>
      {feedback.error ? <p role="alert" className="rounded-lg border border-danger-line bg-danger-subtle p-3 text-body text-danger">{feedback.error}</p> : feedback.message ? <p role="status" className="rounded-lg border border-success-line bg-success-subtle p-3 text-body text-success">{feedback.message}</p> : null}

      {view === "history" && selectedVersion ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="cv-history-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="cv-history-heading" className="text-heading font-semibold text-ink">Saved CV versions</h2>
              <span className={selectedVersion.status === "reviewed" ? "rounded-md bg-success-subtle px-2 py-1 text-meta font-medium text-success" : "rounded-md bg-inset px-2 py-1 text-meta font-medium text-ink-secondary"}>{selectedVersion.status === "reviewed" ? "Reviewed" : "Draft"}</span>
            </div>
            <label htmlFor="cv-version" className="mt-4 block text-meta font-medium text-ink">View a saved version</label>
            <select id="cv-version" value={selectedVersion.id} onChange={(event) => { setSelectedVersionId(event.target.value); setFeedback({}); }} className="focus-ring mt-2 h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-body text-ink">
              {[...versions].reverse().map((version, index) => <option key={version.id} value={version.id}>Version {versions.length - index} · {version.status === "reviewed" ? "Reviewed" : "Draft"} · {savedDate(version.createdAt)}</option>)}
            </select>
            <p className="mt-3 text-meta text-ink-muted">This preview is the document saved <time dateTime={selectedVersion.createdAt}>{savedDate(selectedVersion.createdAt)}</time>. Earlier versions remain unchanged.</p>
            {isCVVersionStale(selectedVersion, profile) ? <p className="mt-3 rounded-lg border border-warning-line bg-warning-subtle p-3 text-meta text-warning">Your Profile has changed since this version was saved. Start a new version from your current verified facts and review it before exporting.</p> : null}
            {dirty ? <p className="mt-3 text-meta text-warning">The current editor has unsaved changes. Export is paused so you do not accidentally use an older selection.</p> : null}
            <div className="mt-4 flex flex-wrap items-start gap-3">
              <Button variant="secondary" onClick={() => startNewVersion(selectedVersion)}><FileText className="h-4 w-4" aria-hidden="true" />{selectedVersion.status === "draft" ? "Continue reviewing" : "Start a new version"}</Button>
              <CVVersionExport key={selectedVersion.id} version={selectedVersion} profile={profile} disabled={dirty || !canUseProfile} disabledReason={dirty ? "Save and review the current editor selection before exporting." : !canUseProfile ? "Resolve Profile storage before exporting." : undefined} />
            </div>
          </section>
          <CVPreview content={selectedVersion.content} />
          <VersionEvidence version={selectedVersion} job={application.job} />
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-w-0 space-y-5">
            <section className="rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="cv-selection-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="cv-selection-heading" className="text-heading font-semibold text-ink">Choose your evidence</h2>
                  <p className="mt-1 text-meta text-ink-muted">{selection.evidence.length} facts · {selection.skillIds.length} skills selected</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => startNewVersion()}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset selection</Button>
              </div>
              <p className="mt-3 text-meta text-ink-secondary">Linked requirements help you choose relevant facts. To correct wording, dates or experience, edit the source in <Link href="/profile" className="focus-ring rounded-sm font-medium text-brand hover:underline">Career Profile</Link>.</p>
              {unavailable > 0 ? <p role="alert" className="mt-3 rounded-lg border border-warning-line bg-warning-subtle p-3 text-meta text-warning">{unavailable} selected item{unavailable === 1 ? " is" : "s are"} no longer verified or available. Reset the selection to use current verified facts.</p> : null}
              {candidates.length === 0 ? <EmptyState icon={FileText} title="No verified evidence yet" description="Add your experience or education to Career Profile and verify the facts before building a CV." action={<Link href="/profile" className={buttonVariants({ variant: "secondary" })}>Open Career Profile</Link>} /> : (
                <div className="mt-5 space-y-4">
                  {groups.map(({ kind, title }) => {
                    const items = candidates.filter((item) => item.kind === kind);
                    if (items.length === 0) return null;
                    return <details key={kind} open={kind === "experience" || kind === "education"} className="rounded-lg border border-line p-3">
                      <summary className="focus-ring cursor-pointer rounded-sm text-body font-semibold text-ink">{title} <span className="ml-1 text-meta font-normal text-ink-muted">({items.length})</span></summary>
                      <div className="mt-3 space-y-2">{items.map((item) => <CandidateOption key={item.id} candidate={item} checked={item.evidenceLink ? selectedEvidence.has(linkKey(item.evidenceLink)) : !!item.skillId && selectedSkills.has(item.skillId)} onChange={() => toggle(item)} />)}</div>
                    </details>;
                  })}
                </div>
              )}
            </section>

            {selection.evidence.length > 1 ? (
              <details className="rounded-xl border border-line bg-surface p-4 sm:p-5">
                <summary className="focus-ring cursor-pointer rounded-sm text-body font-medium text-ink">Arrange selected facts</summary>
                <p className="mt-2 text-meta text-ink-muted">Move facts to change their order within each CV section.</p>
                <ol className="mt-3 space-y-2">
                  {selection.evidence.map((evidence, index) => {
                    const candidate = candidates.find((item) => item.evidenceLink && linkKey(item.evidenceLink) === linkKey(evidence));
                    return <li key={linkKey(evidence)} className="flex items-center gap-2 rounded-lg border border-line p-2.5">
                      <span className="min-w-0 flex-1 text-meta text-ink-secondary">{candidate?.label ?? "Unavailable fact"}<span className="mt-0.5 block truncate text-micro text-ink-muted">{candidate?.text}</span></span>
                      <Button variant="ghost" size="sm" disabled={index === 0} aria-label={`Move ${candidate?.label ?? "fact"} up`} onClick={() => moveEvidence(index, -1)}><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                      <Button variant="ghost" size="sm" disabled={index === selection.evidence.length - 1} aria-label={`Move ${candidate?.label ?? "fact"} down`} onClick={() => moveEvidence(index, 1)}><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                    </li>;
                  })}
                </ol>
              </details>
            ) : null}
          </div>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-heading font-semibold text-ink">Current preview</h2>
              <span className={dirty ? "text-meta font-medium text-warning" : "text-meta text-ink-muted"}>{dirty ? "Unsaved changes" : "Matches latest saved version"}</span>
            </div>
            {content ? <CVPreview content={content} /> : (
              <div className="rounded-xl border border-line bg-surface">
                {verifiedIdentity ? <EmptyState icon={FileText} title={unavailable > 0 ? "Refresh your selection" : "Select your evidence"} description={unavailable > 0 ? "Reset the selection to remove facts that are no longer verified or available." : "Choose at least one verified experience, education, project, achievement or career story to see your CV."} /> : <EmptyState icon={FileText} title="Verify your personal details" description="A CV needs your verified name. Confirm your own personal details in Career Profile to see the preview." action={<Link href="/profile?section=overview" className={buttonVariants({ variant: "secondary" })}>Review personal details</Link>} />}
              </div>
            )}

            <section className="rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="cv-review-heading">
              <h2 id="cv-review-heading" className="text-heading font-semibold text-ink">Review and save</h2>
              <p className="mt-2 text-meta text-ink-secondary">Check the facts, dates and contact details in the preview. Each save keeps a separate document version with its original evidence.</p>
              <p className="mt-3 rounded-lg bg-inset p-3 text-meta text-ink-secondary">Career Profile currently includes example data for new users. Replace any examples with your own facts before reviewing a CV.</p>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-body text-ink">
                <input type="checkbox" checked={reviewed} disabled={!canSave} onChange={(event) => { setReviewedKey(event.target.checked ? currentReviewKey : null); setFeedback({}); }} className="focus-ring mt-1 h-4 w-4 shrink-0 accent-brand disabled:opacity-45" />
                <span>I have reviewed this CV and confirm these facts are mine and accurate.</span>
              </label>
              {verifiedIdentity && selection.evidence.length === 0 ? <p className="mt-3 text-meta text-warning">Select at least one verified experience, education, project, achievement or career story before saving.</p> : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary" disabled={!canSave} onClick={() => save("draft")}>Save draft</Button>
                <Button disabled={!canSave || !reviewed} onClick={() => save("reviewed")}><Check className="h-4 w-4" aria-hidden="true" /> Review and save CV</Button>
              </div>
              <p className="mt-3 text-micro text-ink-muted">Saved in this browser. Export is available after you review and save the CV.</p>
            </section>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export function CVBuilder({ id }: { id: string }) {
  const { profile, isHydrated: profileIsHydrated, canPersist: canUseProfile } = useProfile();
  const { applications, isHydrated } = useApplications();
  if (!isHydrated || !profileIsHydrated) return <PageContainer><LoadingIndicator label="Loading CV workspace" /></PageContainer>;
  const application = applications.find((record) => record.id === id && record.profileId === profile.id);
  if (!application) return <PageContainer><EmptyState title="Application not found" description="This application is not saved for your current Career Profile in this browser." action={<Link href="/applications" className={buttonVariants({ variant: "secondary" })}>Back to applications</Link>} /></PageContainer>;
  return <CVWorkspace key={application.id} application={application} profile={profile} canUseProfile={canUseProfile} />;
}
