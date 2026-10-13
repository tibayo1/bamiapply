"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { MatchSummary } from "@/components/analysis/MatchSummary";
import { StrengthsSection } from "@/components/analysis/StrengthsSection";
import { RequirementsBreakdown } from "@/components/analysis/RequirementsBreakdown";
import { ApplicationProgress } from "@/components/ui/ApplicationProgress";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FitBadge } from "@/components/ui/FitBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useApplications } from "@/lib/applications/context";
import { getLatestSnapshot, isApplicationAnalysisStale } from "@/lib/applications/domain";
import { useProfile } from "@/lib/profile/context";
import { getInitials } from "@/lib/utils";
import type { ApplicationAnalysisSnapshot, ApplicationRecord, ApplicationStatus } from "@/types/application";
import type { CareerProfile, ProfileSource } from "@/types/profile";

const statuses: ApplicationStatus[] = [
  "Saved", "Preparing", "Ready to Apply", "Applied", "Assessment", "Interview",
  "Rejected", "Offer", "Withdrawn", "Skipped",
];

const sourceLabels: Record<ProfileSource, string> = {
  user: "User-entered information",
  cv_import: "CV import",
  application: "Application",
  suggested: "Suggested wording",
};

function savedDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function PostingSource({ job }: { job: ApplicationRecord["job"] }) {
  let postingUrl: string | undefined;
  if (job.sourceUrl) {
    try {
      const parsed = new URL(job.sourceUrl);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") postingUrl = parsed.href;
    } catch {
      // An invalid source stays visible as text without becoming a link.
    }
  }

  return (
    <section aria-labelledby="posting-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="posting-heading" className="text-heading font-semibold text-ink">Saved job posting</h2>
      {postingUrl ? (
        <a href={postingUrl} target="_blank" rel="noopener noreferrer" className="focus-ring mt-3 inline-flex max-w-full items-center gap-1.5 rounded-sm text-meta font-medium text-brand hover:text-brand-hover">
          <span className="break-all">{job.sourceUrl}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </a>
      ) : job.sourceUrl ? (
        <p className="mt-3 break-all text-meta text-ink-secondary">{job.sourceUrl}</p>
      ) : (
        <p className="mt-2 text-meta text-ink-muted">No source URL was provided.</p>
      )}
      {job.rawDescription ? (
        <details className="mt-4 rounded-lg border border-line bg-inset/50 p-3">
          <summary className="focus-ring cursor-pointer rounded-sm text-body font-medium text-ink">View saved job description</summary>
          <p className="mt-3 whitespace-pre-wrap text-body leading-relaxed text-ink-secondary">{job.rawDescription}</p>
        </details>
      ) : (
        <p className="mt-3 text-meta text-ink-muted">The original description was not provided. Saved requirements are shown in the analysis.</p>
      )}
    </section>
  );
}

/** Read-only analysis and evidence from one saved point in time. */
export function ApplicationSnapshotView({ snapshot }: { snapshot: ApplicationAnalysisSnapshot }) {
  const { analysis } = snapshot;

  return (
    <div className="space-y-6">
      <section aria-labelledby="saved-analysis-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="saved-analysis-heading" className="text-heading font-semibold text-ink">Saved fit analysis</h2>
          <FitBadge recommendation={analysis.recommendation} score={analysis.overallFit} />
        </div>
        <p className="mt-3 text-body leading-relaxed text-ink-secondary">{analysis.recommendationReason}</p>
        <p className="mt-4 rounded-lg bg-inset p-3 text-body leading-relaxed text-ink">{analysis.bamiTake}</p>
        <p className="mt-4 text-meta text-ink-muted">
          Saved <time dateTime={snapshot.capturedAt}>{savedDate(snapshot.capturedAt)}</time> from your Career Profile.
          {" "}What-if overrides are excluded from saved applications.
        </p>
      </section>

      {analysis.criticalIssues.length > 0 ? (
        <section aria-labelledby="saved-eligibility-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="saved-eligibility-heading" className="text-heading font-semibold text-ink">Eligibility gates</h2>
          <p className="mt-1 text-meta text-ink-muted">Eligibility is assessed separately from the fit percentage.</p>
          <ul className="mt-4 space-y-3">
            {analysis.criticalIssues.map((issue) => (
              <li key={issue.id} className="rounded-lg border border-line bg-inset/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-body font-semibold text-ink">{issue.label}</h3>
                  <span className={issue.status === "unmet" ? "text-meta font-medium text-danger" : issue.status === "satisfied" ? "text-meta font-medium text-success" : "text-meta font-medium text-warning"}>
                    {issue.status === "satisfied" ? "Satisfied" : issue.status === "unmet" ? issue.isHardBlocker ? "Hard blocker" : "Unmet" : "Needs confirmation"}
                  </span>
                </div>
                <p className="mt-1 text-meta text-ink-secondary">{issue.message}</p>
              </li>
            ))}
          </ul>
          {snapshot.authorizations.length > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-body font-medium text-ink">Authorization information captured from Profile</h3>
              <ul className="mt-2 space-y-2 text-meta text-ink-secondary">
                {snapshot.authorizations.map((authorization) => (
                  <li key={authorization.id} className="space-y-1">
                    <p>
                      {authorization.countryOrRegion}: {authorization.verificationStatus !== "verified" ? "Unconfirmed report — " : ""}
                      {authorization.status === "authorized" ? "Authorized to work" : authorization.status === "requires_sponsorship" ? "Requires sponsorship" : "Authorization unknown"}
                      {authorization.authorizationType ? ` · ${authorization.authorizationType}` : ""}
                    </p>
                    <p className="text-micro text-ink-muted">
                      {authorization.verificationStatus === "verified" ? "Verified when saved" : authorization.verificationStatus === "draft" ? "Draft when saved; not verified" : "Needs confirmation when saved"}
                      {" · "}Expiry: {authorization.expiresAt ? (
                        <>
                          <time dateTime={authorization.expiresAt}>{authorization.expiresAt}</time>
                          {Date.parse(authorization.expiresAt) < Date.parse(snapshot.capturedAt) ? " (expired when saved)" : ""}
                        </>
                      ) : "not provided"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <MatchSummary analysis={analysis} />
      <StrengthsSection requirements={analysis.requirements} />
      <RequirementsBreakdown requirements={analysis.requirements} />

      <section aria-labelledby="saved-evidence-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="saved-evidence-heading" className="text-heading font-semibold text-ink">Evidence saved with this analysis</h2>
        <p className="mt-1 text-meta text-ink-muted">These excerpts were verified in your Career Profile when this analysis was saved.</p>
        {snapshot.evidence.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {snapshot.evidence.map((item, index) => (
              <li key={`${item.link.recordType}:${item.link.recordId}:${item.link.claimId ?? "record"}:${index}`} className="rounded-lg border border-line bg-inset/50 p-3">
                <p className="text-body font-semibold text-ink">
                  {item.recordTitle}{item.sourceOrganization ? <span className="font-normal text-ink-secondary"> · {item.sourceOrganization}</span> : null}
                </p>
                <p className="mt-2 text-body leading-relaxed text-ink-secondary">{item.excerpt}</p>
                <p className="mt-2 text-micro text-ink-muted">
                  {sourceLabels[item.source]} · Source updated <time dateTime={item.recordUpdatedAt}>{savedDate(item.recordUpdatedAt)}</time>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-body text-ink-secondary">No verified Profile excerpts supported this analysis when it was saved.</p>
        )}
      </section>
    </div>
  );
}

function StatusEditor({ application, disabled, onSave }: {
  application: ApplicationRecord;
  disabled: boolean;
  onSave: (status: ApplicationStatus, reason?: string) => { error?: string | null };
}) {
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [reason, setReason] = useState(application.status === "Skipped" ? application.skipReason ?? "" : "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSave(status, reason.trim() || undefined);
    setError(result.error ?? null);
    setNotice(result.error ? null : "Application status saved.");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="application-status" className="block text-meta font-medium text-ink">Update status</label>
      <select id="application-status" value={status} disabled={disabled} onChange={(event) => { setStatus(event.target.value as ApplicationStatus); setNotice(null); setError(null); }} className="focus-ring h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-body text-ink disabled:opacity-45">
        {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <label htmlFor="status-reason" className="block text-meta font-medium text-ink">{status === "Skipped" ? "Skip reason (optional)" : "Reason (optional)"}</label>
      <textarea id="status-reason" value={reason} disabled={disabled} rows={3} maxLength={2000} onChange={(event) => { setReason(event.target.value); setNotice(null); setError(null); }} className="focus-ring w-full resize-y rounded-md border border-line-strong bg-surface p-3 text-body text-ink disabled:opacity-45" />
      <Button type="submit" variant="secondary" disabled={disabled}>Save status</Button>
      {error ? <p role="alert" className="text-meta text-danger">{error}</p> : notice ? <p role="status" className="text-meta text-success">{notice}</p> : null}
    </form>
  );
}

function SavedApplicationDetail({ application, profile, canUseProfile }: {
  application: ApplicationRecord;
  profile: CareerProfile;
  canUseProfile: boolean;
}) {
  const { canPersist, changeStatus, refreshAnalysis } = useApplications();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ error?: string | null; message?: string }>({});
  const latest = getLatestSnapshot(application);
  const selectedSnapshot = application.snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? latest;
  const analysisIsStale = isApplicationAnalysisStale(application, profile);
  const isHistorical = selectedSnapshot.id !== latest.id;

  function refresh() {
    const result = refreshAnalysis(application.id, profile);
    setFeedback(result.error ? { error: result.error } : { message: "Analysis refreshed. Earlier snapshots are preserved." });
    if (!result.error) setSelectedSnapshotId(null);
  }

  return (
    <PageContainer width="wide" className="space-y-8">
      <Link href="/applications" className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-meta font-medium text-ink-secondary hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Applications
      </Link>
      <header className="flex items-start gap-4">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-inset text-meta font-semibold tracking-wide text-ink-secondary">{getInitials(application.company)}</span>
        <div className="min-w-0">
          <p className="text-body font-medium text-ink-secondary">{application.company}</p>
          <h1 className="mt-0.5 text-title font-semibold text-ink">{application.role}</h1>
          <p className="mt-1.5 flex items-center gap-1 text-meta text-ink-muted"><MapPin className="h-3 w-3" aria-hidden="true" />{application.location}</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="snapshot-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="snapshot-heading" className="text-heading font-semibold text-ink">Analysis history</h2>
            <label htmlFor="analysis-snapshot" className="mt-3 block text-meta font-medium text-ink">View a saved analysis</label>
            <select id="analysis-snapshot" value={selectedSnapshot.id} onChange={(event) => setSelectedSnapshotId(event.target.value)} className="focus-ring mt-2 h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-body text-ink">
              {[...application.snapshots].reverse().map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>{snapshot.id === latest.id ? "Latest · " : "Earlier · "}{savedDate(snapshot.capturedAt)} · {snapshot.analysis.overallFit}% · {snapshot.analysis.recommendation}</option>
              ))}
            </select>
            {isHistorical ? <p className="mt-3 text-meta text-ink-secondary">You are viewing an earlier analysis. The application list uses the latest saved analysis.</p> : null}
            {analysisIsStale ? (
              <p className="mt-3 rounded-lg border border-warning-line bg-warning-subtle/30 p-3 text-meta text-ink-secondary">Your Career Profile or current eligibility has changed since the latest analysis. Saved scores and evidence stay unchanged until you refresh.</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={refresh} disabled={!canPersist || !canUseProfile || !analysisIsStale}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh analysis
              </Button>
              <Link href="/profile" className="focus-ring rounded-sm text-meta font-medium text-brand hover:text-brand-hover">Review Career Profile</Link>
            </div>
            {!canUseProfile ? <p className="mt-3 text-meta text-warning">Resolve the Career Profile storage issue before refreshing this analysis.</p> : null}
            {feedback.error ? <p role="alert" className="mt-3 text-meta text-danger">{feedback.error}</p> : feedback.message ? <p role="status" className="mt-3 text-meta text-success">{feedback.message}</p> : null}
          </section>

          <ApplicationSnapshotView key={selectedSnapshot.id} snapshot={selectedSnapshot} />
          <PostingSource job={application.job} />
          <section aria-labelledby="preparation-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="preparation-heading" className="text-heading font-semibold text-ink">Preparation</h2>
            <ApplicationProgress className="mt-3 gap-x-5" cvStatus={application.cvStatus} coverLetterStatus={application.coverLetterStatus} questionsCompleted={application.questionsCompleted} questionsTotal={application.questionsTotal} />
            <p className="mt-3 text-meta text-ink-muted">Document generation is not available yet. Changing the application status does not create a CV, cover letter or answers.</p>
          </section>
        </div>

        <aside aria-labelledby="tracking-heading" className="space-y-6">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 id="tracking-heading" className="text-heading font-semibold text-ink">Application tracking</h2>
            <div className="mt-3"><StatusBadge status={application.status} /></div>
            <dl className="my-4 space-y-2 border-y border-line py-3 text-meta">
              <div><dt className="text-ink-muted">Created</dt><dd className="mt-0.5 text-ink"><time dateTime={application.createdAt}>{savedDate(application.createdAt)}</time></dd></div>
              <div><dt className="text-ink-muted">Updated</dt><dd className="mt-0.5 text-ink"><time dateTime={application.updatedAt}>{savedDate(application.updatedAt)}</time></dd></div>
            </dl>
            <StatusEditor key={`${application.id}:${application.statusHistory.length}`} application={application} disabled={!canPersist} onSave={(status, reason) => changeStatus(application.id, status, reason)} />
          </section>
          <section aria-labelledby="status-history-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="status-history-heading" className="text-heading font-semibold text-ink">Status history</h2>
            <ol className="mt-4 space-y-4">
              {[...application.statusHistory].reverse().map((event, index) => (
                <li key={`${event.changedAt}:${index}`}>
                  <StatusBadge status={event.status} />
                  <p className="mt-1 text-micro text-ink-muted"><time dateTime={event.changedAt}>{savedDate(event.changedAt)}</time></p>
                  {event.reason ? <p className="mt-1 whitespace-pre-wrap text-meta text-ink-secondary">{event.reason}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}

export function ApplicationDetail({ id }: { id: string }) {
  const { applications, isHydrated: applicationsHydrated } = useApplications();
  const { profile, isHydrated: profileHydrated, canPersist: canUseProfile } = useProfile();

  if (!applicationsHydrated || !profileHydrated) {
    return <PageContainer width="content"><p role="status" className="text-body text-ink-secondary">Loading your saved application…</p></PageContainer>;
  }

  const application = applications.find((record) => record.id === id && record.profileId === profile.id);
  if (!application) {
    return (
      <PageContainer width="content" className="space-y-6">
          <EmptyState title="Application not found" description="This application is not saved for your current Career Profile in this browser." action={<Link href="/applications" className={buttonVariants({ variant: "secondary" })}>Back to applications</Link>} />
      </PageContainer>
    );
  }

  return <SavedApplicationDetail key={application.id} application={application} profile={profile} canUseProfile={canUseProfile} />;
}
