import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, ExternalLink, MapPin, XCircle } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { JobAnalysis } from "@/types/analysis";
import type { ApplicationStatus } from "@/types/application";

interface AnalysisHeaderProps {
  analysis: JobAnalysis;
  onBuildApplication: () => void;
  onSaveForLater: () => void;
  onSkipRole: () => void;
  applicationStatus?: ApplicationStatus;
  actionsDisabled?: boolean;
}

export function AnalysisHeader({
  analysis,
  onBuildApplication,
  onSaveForLater,
  onSkipRole,
  applicationStatus,
  actionsDisabled = false,
}: AnalysisHeaderProps) {
  const { company, role, location, sourceUrl } = analysis;
  const isSaved = applicationStatus !== undefined;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="focus-ring transition-ui -ml-1 inline-flex items-center gap-1.5 rounded-sm px-1 text-meta font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-line">
        {/* Company & Role */}
        <div className="flex items-start gap-4 min-w-0">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-inset text-meta font-semibold tracking-wide text-ink-secondary border border-line"
          >
            {getInitials(company)}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-meta font-medium text-ink-secondary uppercase tracking-wider">
                {company}
              </span>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-micro text-ink-muted hover:text-brand transition-colors font-mono"
                  title="View original posting"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="hidden sm:inline">Original posting</span>
                </a>
              )}
            </div>

            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
              {role}
            </h1>

            <p className="mt-1.5 flex items-center gap-1.5 text-meta text-ink-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{location}</span>
            </p>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onSkipRole}
            disabled={actionsDisabled || applicationStatus === "Skipped"}
            className="text-ink-muted hover:text-danger"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Skip role
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onSaveForLater}
            disabled={actionsDisabled || isSaved}
          >
            <Bookmark className="h-4 w-4 mr-1.5" />
            {isSaved ? applicationStatus === "Saved" ? "Saved" : "Tracked" : "Save for later"}
          </Button>

          {/* Primary Action Button */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onBuildApplication}
            disabled={actionsDisabled}
          >
            {isSaved && applicationStatus !== "Saved" && applicationStatus !== "Skipped"
              ? "Open application"
              : "Build application"}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
