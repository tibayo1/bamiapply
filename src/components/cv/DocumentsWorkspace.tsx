"use client";

import Link from "next/link";
import { FileText, Mail, MessageSquareText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonVariants } from "@/components/ui/Button";
import { useApplications } from "@/lib/applications/context";
import { useProfile } from "@/lib/profile/context";
import { isCVVersionStale } from "@/lib/cv/domain";

export function DocumentsWorkspace() {
  const { applications, isHydrated: applicationsHydrated } = useApplications();
  const { profile, isHydrated: profileHydrated, canPersist: canUseProfile } = useProfile();

  if (!applicationsHydrated || !profileHydrated) {
    return <PageContainer><p role="status" className="text-body text-ink-secondary">Loading your documents…</p></PageContainer>;
  }

  const prepared = applications
    .filter((application) => application.profileId === profile.id && (application.cvVersions?.length ?? 0) > 0)
    .sort((a, b) => Date.parse(b.cvVersions!.at(-1)!.createdAt) - Date.parse(a.cvVersions!.at(-1)!.createdAt));
  const versionCount = prepared.reduce((total, application) => total + application.cvVersions!.length, 0);
  const kinds = [
    { icon: FileText, label: "CV versions", count: versionCount, description: "Saved drafts and reviewed CVs, organised by role." },
    { icon: Mail, label: "Cover letters", count: 0, description: "Coming in a later stage." },
    { icon: MessageSquareText, label: "Application answers", count: 0, description: "Coming in a later stage." },
  ];

  return (
    <PageContainer width="narrow" className="space-y-8">
      <PageHeader title="Documents" description="Prepare a CV for each application and keep every saved version." />
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <ul className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {kinds.map(({ icon: Icon, label, count, description }) => (
            <li key={label} className="p-5">
              <div className="flex items-center justify-between">
                <Icon className="h-[18px] w-[18px] text-ink-muted" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-meta tabular-nums text-ink-muted">{count}</span>
              </div>
              <p className="mt-3 text-body font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-meta text-ink-secondary">{description}</p>
            </li>
          ))}
        </ul>
      </div>
      {prepared.length ? (
        <section aria-labelledby="saved-cvs-heading" className="space-y-4">
          <h2 id="saved-cvs-heading" className="text-heading font-semibold text-ink">Saved CVs</h2>
          <ul className="space-y-4">
            {prepared.map((application) => {
              const latest = application.cvVersions!.at(-1)!;
              const stale = isCVVersionStale(latest, profile);
              const count = application.cvVersions!.length;
              return (
                <li key={application.id} className="rounded-xl border border-line bg-surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-meta text-ink-secondary">{application.company}</p>
                      <h3 className="mt-1 break-words text-heading font-semibold text-ink">{application.role}</h3>
                    </div>
                    <span className="rounded-md bg-inset px-2.5 py-1 text-meta font-medium text-ink-secondary">{latest.status === "reviewed" ? "Reviewed" : "Draft"}</span>
                  </div>
                  <p className="mt-3 text-meta text-ink-muted">
                    {count} saved {count === 1 ? "version" : "versions"} · Latest saved <time dateTime={latest.createdAt}>{new Date(latest.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
                  </p>
                  {stale ? <p className="mt-2 text-meta text-warning">Profile has changed. Create and review a new version before exporting.</p> : !canUseProfile ? <p className="mt-2 text-meta text-warning">Resolve the Profile storage issue before preparing or exporting a CV.</p> : latest.status === "draft" ? <p className="mt-2 text-meta text-ink-secondary">Review the CV before exporting it.</p> : null}
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Link href={`/applications/${encodeURIComponent(application.id)}/cv`} className={buttonVariants({ variant: "secondary" })}>Open CV builder</Link>
                    <Link href={`/applications/${encodeURIComponent(application.id)}`} className="focus-ring rounded-sm text-meta font-medium text-brand hover:text-brand-hover">View application</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState icon={FileText} title="Prepare your first tailored CV" description="Open a saved application to choose verified Profile evidence, preview your CV, and save a version." action={<Link href="/applications" className={buttonVariants({ variant: "primary" })}>View applications</Link>} />
        </div>
      )}
      <p className="text-meta text-ink-muted">Documents are saved in this browser with their application. Download reviewed CVs and export your application backup before clearing browser data.</p>
    </PageContainer>
  );
}
