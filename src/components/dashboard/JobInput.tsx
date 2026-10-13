"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { JobImportForm } from "@/components/jobs/JobImportForm";
import { useJobs } from "@/lib/jobs/context";
import { useProfile } from "@/lib/profile/context";

/** Import real postings and keep the demo as an explicitly named sample. */
export function JobInput() {
  const { profile, isHydrated: profileHydrated } = useProfile();
  const { jobs, isHydrated: jobsHydrated } = useJobs();
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const reviewedJobs = profileHydrated && jobsHydrated
    ? jobs.filter((job) => job.profileId === profile.id).slice().reverse()
    : [];
  const sourceJob = reviewedJobs.find((job) => job.id === reviewJobId)?.posting;
  return (
    <section
      id="job-input"
      aria-labelledby="job-input-heading"
      className="scroll-mt-6 rounded-xl border border-line bg-surface p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 text-micro font-medium text-brand">
        <span className="accent-slash" aria-hidden="true" />
        Analyze a job
      </p>
      <h2 id="job-input-heading" className="mt-2 text-heading font-semibold text-ink">
        Bring a real job into your workspace
      </h2>
      <p className="mt-1 max-w-prose text-body text-ink-secondary">
        Paste a job description, review what the employer needs, and link the
        verified facts from your Career Profile that support a match.
      </p>
      <JobImportForm key={`${profile.id}:${sourceJob?.id ?? "new"}`} sourceJob={sourceJob} />
      {sourceJob ? <Button variant="ghost" className="mt-3" onClick={() => setReviewJobId(null)}>Start a different job</Button> : null}
      {reviewedJobs.length ? (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-meta font-semibold text-ink">Your reviewed jobs</h3>
          <p className="mt-1 text-meta text-ink-muted">Resume an analysis before or after saving it to Applications.</p>
          <ul className="mt-3 divide-y divide-line rounded-md border border-line">
            {reviewedJobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center gap-2 pr-3">
                <Link href={`/analysis/${encodeURIComponent(job.id)}`} className="focus-ring flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-3 py-3 transition-ui hover:bg-inset">
                  <span className="min-w-0"><span className="block text-body font-medium text-ink">{job.posting.role}</span><span className="mt-0.5 block text-meta text-ink-secondary">{job.posting.company}{job.posting.location ? ` · ${job.posting.location}` : ""}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
                <Button variant="ghost" size="sm" onClick={() => { setReviewJobId(job.id); document.getElementById("job-input")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label={`Review requirements again for ${job.posting.role}`}>Review again</Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-meta text-ink-muted">Want to explore first? Try the Hamilton Medical sample role.</p>
        <Link href="/analysis/hamilton-medical-001?simulate=true" className={buttonVariants({ variant: "secondary" })}>Open sample analysis<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
