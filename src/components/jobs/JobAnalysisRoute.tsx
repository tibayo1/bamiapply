"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { buttonVariants } from "@/components/ui/Button";
import { JobAnalysisView } from "@/components/analysis/JobAnalysisView";
import { useProfile } from "@/lib/profile/context";
import { useJobs } from "@/lib/jobs/context";
import { useApplications } from "@/lib/applications/context";
import { hamiltonJob } from "@/lib/analysis/mock-hamilton";

/** Browser-owned jobs cannot be looked up in a server route or replaced with a sample. */
export function JobAnalysisRoute({ id, shouldSimulate = false }: { id: string; shouldSimulate?: boolean }) {
  const { profile, isHydrated: isProfileHydrated } = useProfile();
  const { isHydrated: areJobsHydrated, getJob } = useJobs();
  const { isHydrated: areApplicationsHydrated, getApplicationForJob } = useApplications();

  if (id === hamiltonJob.id) return <JobAnalysisView key={id} job={hamiltonJob} simulateLoadingOnMount={shouldSimulate} />;
  if (!isProfileHydrated || !areJobsHydrated || !areApplicationsHydrated) {
    return <PageContainer><p role="status" className="py-12 text-body text-ink-secondary">Loading your reviewed job…</p></PageContainer>;
  }

  const job = getJob(id, profile.id)?.posting ?? getApplicationForJob(id, profile.id)?.job;
  if (!job) {
    return (
      <PageContainer>
        <div className="py-12">
          <h1 className="text-page-title font-semibold text-ink">Job analysis unavailable</h1>
          <p className="mt-3 max-w-prose text-body text-ink-secondary">This reviewed job is unavailable in the current Profile&apos;s browser workspace. You can import and review the posting again from your dashboard.</p>
          <Link href="/dashboard#job-input" className={buttonVariants({ variant: "secondary", className: "mt-5" })}>Go to dashboard</Link>
        </div>
      </PageContainer>
    );
  }
  return <JobAnalysisView key={id} job={job} simulateLoadingOnMount={shouldSimulate} />;
}
