"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Greeting } from "@/components/dashboard/Greeting";
import { JobInput } from "@/components/dashboard/JobInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { useApplications } from "@/lib/applications/context";
import { useProfile } from "@/lib/profile/context";
import { ApplicationsExplorer } from "./ApplicationsExplorer";

function ApplicationsLoading() {
  return (
    <p role="status" className="rounded-xl border border-line bg-surface p-6 text-body text-ink-secondary">
      Loading your saved applications…
    </p>
  );
}

export function DashboardWorkspace() {
  const { applications, isHydrated: applicationsHydrated } = useApplications();
  const { profile, isHydrated: profileHydrated } = useProfile();
  const isReady = applicationsHydrated && profileHydrated;
  const firstName = profile.personal.name.trim().split(/\s+/)[0];
  const profileApplications = applications.filter((application) => application.profileId === profile.id);

  return (
    <PageContainer width="content" className="space-y-8 sm:space-y-10">
      {profileHydrated && firstName ? (
        <Greeting name={firstName} />
      ) : (
        <header>
          <h1 className="text-title font-semibold text-ink">Your workspace</h1>
          <p className="mt-1 text-body text-ink-secondary">Find the opportunities worth your time.</p>
        </header>
      )}
      <JobInput />
      <section aria-labelledby="continue-heading">
        <h2 id="continue-heading" className="mb-4 text-heading font-semibold text-ink">
          Continue where you left off
        </h2>
        {isReady ? <ApplicationsExplorer applications={profileApplications} limit={6} /> : <ApplicationsLoading />}
      </section>
    </PageContainer>
  );
}

export function ApplicationsWorkspace() {
  const { applications, isHydrated: applicationsHydrated } = useApplications();
  const { profile, isHydrated: profileHydrated } = useProfile();
  const isReady = applicationsHydrated && profileHydrated;
  const profileApplications = applications.filter((application) => application.profileId === profile.id);

  return (
    <PageContainer width="wide" className="space-y-8">
      <PageHeader
        title="Applications"
        description="Track every role from discovery to decision."
        actions={
          <Link href="/dashboard#job-input" className={buttonVariants({ variant: "primary" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add application
          </Link>
        }
      />
      {isReady ? <ApplicationsExplorer applications={profileApplications} /> : <ApplicationsLoading />}
    </PageContainer>
  );
}
