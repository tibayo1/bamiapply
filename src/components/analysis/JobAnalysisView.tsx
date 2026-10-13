"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { FitBadge } from "@/components/ui/FitBadge";
import { Button } from "@/components/ui/Button";
import type { JobAnalysis, JobPosting, JobRequirement } from "@/types/analysis";
import { useProfile } from "@/lib/profile/context";
import { useApplications } from "@/lib/applications/context";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import type { OverrideMap } from "@/lib/analysis/overrides";
import { AnalysisHeader } from "./AnalysisHeader";
import { AnalysisLoader } from "./AnalysisLoader";
import { CriticalChecks } from "./CriticalChecks";
import { MatchSummary } from "./MatchSummary";
import { StrengthsSection } from "./StrengthsSection";
import { GapsSection } from "./GapsSection";
import { RequirementsBreakdown } from "./RequirementsBreakdown";
import { AddEvidenceModal } from "./AddEvidenceModal";
import { SkipRoleModal } from "./SkipRoleModal";

interface JobAnalysisViewProps {
  job: JobPosting;
  simulateLoadingOnMount?: boolean;
}

export function JobAnalysisView({
  job,
  simulateLoadingOnMount = false,
}: JobAnalysisViewProps) {
  const router = useRouter();
  const {
    profile,
    isHydrated: isProfileHydrated,
    canPersist: canPersistProfile,
    persistenceIssue: profilePersistenceIssue,
  } = useProfile();
  const {
    isHydrated: areApplicationsHydrated,
    canPersist: canPersistApplications,
    persistenceIssue: applicationsPersistenceIssue,
    saveApplication,
    changeStatus,
    getApplicationForJob,
  } = useApplications();

  // Simulated loading state
  const [loading, setLoading] = useState(simulateLoadingOnMount);

  // Local interactive what-if overrides (does not corrupt profile)
  const [overrides, setOverrides] = useState<OverrideMap>({});

  // Application status belongs to the persisted Applications domain.
  const application = getApplicationForJob(job.id, profile.id);
  const isSaved = application !== undefined;
  const isSkipped = application?.status === "Skipped";
  const skipReason = application?.skipReason;
  const actionsDisabled = !isProfileHydrated || !areApplicationsHydrated ||
    !canPersistProfile || !canPersistApplications;
  const [actionError, setActionError] = useState<string | null>(null);
  const hasOverrides = Object.keys(overrides).length > 0;
  const persistenceError = profilePersistenceIssue || applicationsPersistenceIssue;

  // Modal states
  const [addEvidenceModalOpen, setAddEvidenceModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<JobRequirement | null>(null);
  const [skipModalOpen, setSkipModalOpen] = useState(false);

  // Keep the actual eligibility assessment visible even during what-if edits.
  const baselineAnalysis = buildJobAnalysis({ profile, job });
  const analysis: JobAnalysis = hasOverrides
    ? buildJobAnalysis({ profile, job, overrides })
    : baselineAnalysis;
  const hasBaselineHardBlocker = baselineAnalysis.criticalIssues.some(
    (issue) => issue.status === "unmet" && issue.isHardBlocker
  );

  // Handlers for critical issue resolutions
  function handleCriticalResolve(
    issueId: string,
    action: "satisfy" | "block" | "unsure"
  ) {
    const issue = analysis.criticalIssues.find((c) => c.id === issueId);
    if (!issue) return;

    setOverrides((prev) => {
      const next = { ...prev };
      if (action === "satisfy") {
        next[issue.requirementId] = { action: "satisfy" };
      } else if (action === "block") {
        next[issue.requirementId] = { action: "block" };
      } else {
        delete next[issue.requirementId];
      }
      return next;
    });
  }

  // Handler for adding custom profile evidence to a requirement
  function handleAddEvidence(reqId: string, note: string) {
    setOverrides((prev) => ({
      ...prev,
      [reqId]: { action: "confirm_experience", note },
    }));
  }

  function handleBuildApplication() {
    if (actionsDisabled) return;
    const result = saveApplication(job, profile, { status: "Preparing" });
    setActionError(result.error);
    if (result.error || !result.id) return;
    router.push(`/applications/${encodeURIComponent(result.id)}`);
  }

  function handleSaveForLater() {
    if (actionsDisabled) return;
    const result = saveApplication(job, profile, { status: "Saved" });
    setActionError(result.error);
  }

  function handleConfirmSkip(reason: string) {
    if (actionsDisabled) return;
    const result = application
      ? changeStatus(application.id, "Skipped", reason)
      : saveApplication(job, profile, { status: "Skipped", reason });
    setActionError(result.error);
  }

  function handleUndoSkip() {
    if (actionsDisabled || !application) return;
    const result = changeStatus(application.id, "Saved");
    setActionError(result.error);
  }

  // Match the server and first client render until browser Profile data is ready.
  if (!isProfileHydrated) {
    return (
      <PageContainer width="wide">
        <p role="status" className="text-body text-ink-secondary">
          Loading your Career Profile before analysing this role…
        </p>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer width="wide">
        <AnalysisLoader
          role={job.role}
          company={job.company}
          onComplete={() => setLoading(false)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide" className="space-y-8 sm:space-y-10 pb-20">
      {/* Top Header & Actions */}
      <AnalysisHeader
        analysis={analysis}
        onBuildApplication={handleBuildApplication}
        onSaveForLater={handleSaveForLater}
        onSkipRole={() => setSkipModalOpen(true)}
        applicationStatus={application?.status}
        actionsDisabled={actionsDisabled}
      />

      {!isProfileHydrated || !areApplicationsHydrated ? (
        <p role="status" className="text-meta text-ink-secondary">
          Loading your profile and saved applications…
        </p>
      ) : actionsDisabled && !persistenceError ? (
        <p role="alert" className="rounded-xl border border-warning p-4 text-meta text-warning">
          Saving is unavailable. Check your Career Profile and Applications for recovery options.
        </p>
      ) : null}

      {(actionError || persistenceError) && (
        <p role="alert" className="rounded-xl border border-warning p-4 text-meta text-warning">
          {actionError || persistenceError}
        </p>
      )}

      {hasOverrides && (
        <p role="status" className="rounded-xl border border-line bg-inset p-4 text-meta text-ink-secondary">
          This view includes your what-if changes. Saved applications use the baseline analysis
          from your verified Career Profile; these temporary changes and notes are excluded.
        </p>
      )}

      {hasBaselineHardBlocker && (
        <p role="status" className="rounded-xl border border-warning p-4 text-meta text-warning">
          Your baseline analysis has an unmet eligibility requirement. You can track this role
          and open its preparation workspace; resolve the requirement before applying.
        </p>
      )}

      {/* Skipped Notice if role was skipped */}
      {isSkipped && (
        <div className="rounded-xl border border-line bg-inset p-4 flex items-center justify-between">
          <p className="text-meta text-ink-secondary">
            You marked this opportunity as <strong>Skipped</strong> {skipReason ? `(${skipReason})` : ""}.
          </p>
          <button
            type="button"
            onClick={handleUndoSkip}
            disabled={actionsDisabled}
            className="text-meta font-medium text-brand hover:underline disabled:opacity-45"
          >
            Undo
          </button>
        </div>
      )}

      {/* Main Recommendation Hero Card */}
      <section
        aria-label="Fit recommendation"
        className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
              <span className="font-bold text-brand mr-0.5">/</span>
              BÁMI FIT DETERMINATION
            </div>

            {/* Recommendation label visually dominates the percentage */}
            <div className="flex flex-wrap items-baseline gap-4">
              <FitBadge recommendation={analysis.recommendation} size="lg" />
              <div className="flex items-baseline gap-1.5 font-mono text-ink-muted">
                <span className="text-3xl font-bold tabular-nums text-ink tracking-tight">
                  {analysis.overallFit}%
                </span>
                <span className="text-meta uppercase">scored match</span>
              </div>
            </div>

            <p className="text-body text-ink-secondary leading-relaxed pt-1">
              {analysis.recommendationReason}
            </p>
          </div>

          {/* Quick Stats Block */}
          <div className="flex lg:flex-col items-center lg:items-end justify-between sm:justify-start gap-3 border-t lg:border-t-0 lg:border-l border-line pt-4 lg:pt-0 lg:pl-6 shrink-0 font-mono text-meta">
            <div>
              <span className="text-micro text-ink-muted uppercase block">
                Evidence Coverage
              </span>
              <span className="text-heading font-semibold text-ink tabular-nums">
                {analysis.evidenceCoverage}%
              </span>
            </div>
            <div>
              <span className="text-micro text-ink-muted uppercase block">
                Confidence
              </span>
              <span className="text-heading font-semibold text-brand">
                {analysis.confidence}
              </span>
            </div>
          </div>
        </div>

        {/* Bámi's Take callout */}
        <div className="mt-6 rounded-xl bg-inset border-l-3 border-brand p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-brand">
              <span className="font-bold text-brand mr-1">/</span>
              BÁMI&apos;S TAKE
            </span>
            <span className="font-mono text-[0.6875rem] text-ink-muted uppercase">
              Positioning Analysis
            </span>
          </div>
          <p className="mt-2 text-body font-medium text-ink leading-relaxed">
            &ldquo;{analysis.bamiTake}&rdquo;
          </p>
        </div>
      </section>

      {/* Critical Eligibility Checks ("Before you apply") */}
      <CriticalChecks
        issues={analysis.criticalIssues}
        onResolve={handleCriticalResolve}
      />

      {/* Match Summary (Non-radial breakdown) */}
      <MatchSummary analysis={analysis} />

      {/* Your Strongest Advantages */}
      <StrengthsSection requirements={analysis.requirements} />

      {/* Gaps to Consider */}
      <GapsSection
        requirements={analysis.requirements}
        criticalIssues={analysis.criticalIssues}
        onAddExperience={(r) => {
          setSelectedReq(r);
          setAddEvidenceModalOpen(true);
        }}
      />

      {/* Full Requirements Breakdown */}
      <RequirementsBreakdown
        requirements={analysis.requirements}
        onAddExperience={(r) => {
          setSelectedReq(r);
          setAddEvidenceModalOpen(true);
        }}
      />

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-surface/95 backdrop-blur-md py-3 px-4 sm:px-8 shadow-float">
        <div className="mx-auto flex max-w-wide items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <FitBadge recommendation={analysis.recommendation} size="sm" />
            <div className="hidden sm:block truncate text-meta text-ink-secondary">
              <span className="font-medium text-ink">{analysis.role}</span> · {analysis.company}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveForLater}
              disabled={actionsDisabled || isSaved}
            >
              <Bookmark className="h-3.5 w-3.5 mr-1" />
              {application ? application.status === "Saved" ? "Saved" : "Tracked" : "Save for later"}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleBuildApplication}
              disabled={actionsDisabled}
            >
              {application && application.status !== "Saved" && application.status !== "Skipped"
                ? "Open application"
                : "Build application"}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddEvidenceModal
        requirement={selectedReq}
        open={addEvidenceModalOpen}
        onOpenChange={setAddEvidenceModalOpen}
        onConfirm={handleAddEvidence}
      />

      <SkipRoleModal
        open={skipModalOpen}
        onOpenChange={setSkipModalOpen}
        onConfirmSkip={handleConfirmSkip}
      />
    </PageContainer>
  );
}
