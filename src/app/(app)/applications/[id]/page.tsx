import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { FitBadge } from "@/components/ui/FitBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApplicationProgress } from "@/components/ui/ApplicationProgress";
import { FitSignals } from "@/components/analysis/FitSignals";
import { mockApplications, mockJobAnalysis } from "@/lib/mock-data";
import { formatRelativeDate, getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "Application" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const application = mockApplications.find((a) => a.id === id);
  if (!application) notFound();

  const {
    company,
    role,
    location,
    fitScore,
    recommendation,
    status,
    updatedAt,
    cvStatus,
    coverLetterStatus,
    questionsCompleted,
    questionsTotal,
  } = application;

  const properties: { label: string; value: React.ReactNode }[] = [
    { label: "Company", value: company },
    { label: "Location", value: location },
    { label: "Status", value: <StatusBadge status={status} /> },
    { label: "Fit", value: <FitBadge recommendation={recommendation} score={fitScore} /> },
    { label: "Updated", value: formatRelativeDate(updatedAt) },
  ];

  return (
    <PageContainer width="narrow" className="space-y-8">
      <Link
        href="/applications"
        className="focus-ring transition-ui -ml-1 inline-flex items-center gap-1.5 rounded-sm px-1 text-meta font-medium text-ink-secondary hover:text-ink lg:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Applications
      </Link>

      <header className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-inset text-meta font-semibold tracking-wide text-ink-secondary"
        >
          {getInitials(company)}
        </span>
        <div className="min-w-0">
          <p className="text-body font-medium text-ink-secondary">{company}</p>
          <h1 className="mt-0.5 text-title font-semibold text-ink">{role}</h1>
          <p className="mt-1.5 flex items-center gap-1 text-meta text-ink-muted">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {location}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
        <div className="space-y-6">
          <section
            aria-labelledby="analysis-heading"
            className="rounded-xl border border-line bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="analysis-heading" className="text-heading font-semibold text-ink">
                Fit analysis
              </h2>
              <FitBadge recommendation={recommendation} score={fitScore} />
            </div>
            <p className="mt-1 text-body text-ink-secondary">{mockJobAnalysis.summary}</p>
            <div className="mt-6 border-t border-line pt-6">
              <FitSignals
                matches={mockJobAnalysis.strongMatches}
                gaps={mockJobAnalysis.potentialGaps}
                idPrefix="detail"
              />
            </div>
            <p className="mt-6 rounded-lg bg-inset px-3 py-2.5 text-meta text-ink-secondary">
              This is a sample analysis. A full, evidence-backed breakdown arrives with job analysis.
            </p>
          </section>

          <section
            aria-labelledby="prep-heading"
            className="rounded-xl border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="prep-heading" className="text-heading font-semibold text-ink">
              Preparation
            </h2>
            <ApplicationProgress
              className="mt-3 gap-x-5"
              cvStatus={cvStatus}
              coverLetterStatus={coverLetterStatus}
              questionsCompleted={questionsCompleted}
              questionsTotal={questionsTotal}
            />
          </section>
        </div>

        <aside aria-labelledby="properties-heading">
          <h2 id="properties-heading" className="text-meta font-semibold text-ink">
            Properties
          </h2>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            {properties.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-meta text-ink-muted">{label}</dt>
                <dd className="min-w-0 truncate text-right text-meta text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </PageContainer>
  );
}
