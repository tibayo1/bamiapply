import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { cn, formatRelativeDate, getInitials } from "@/lib/utils";
import { FitBadge } from "@/components/ui/FitBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApplicationProgress } from "@/components/ui/ApplicationProgress";
import type { Application } from "@/types/application";

/**
 * Column template shared by the row and the list's column header so they
 * always align. Only applied from xl; below that the row stacks.
 *   identity · fit · status · preparation · updated · chevron
 */
export const applicationGrid =
  "xl:grid xl:grid-cols-[minmax(0,1fr)_10.5rem_8.5rem_14.5rem_5.5rem_1.5rem] xl:items-center xl:gap-x-5";

const PREPARING = ["Saved", "Preparing", "Ready to Apply"];

interface ApplicationCardProps {
  application: Application;
}

/**
 * ApplicationCard — a structured record row.
 *
 * Reads left to right as: who (company, role, location) → should I
 * pursue it (fit) → where am I (status) → what's left (preparation)
 * → when. The whole row is one link. Rendered as a list item; the
 * parent supplies the surrounding <ul> and surface.
 */
export function ApplicationCard({ application }: ApplicationCardProps) {
  const {
    id,
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

  const inPreparation = PREPARING.includes(status);

  return (
    <li className="border-t border-line first:border-t-0">
      <Link
        href={`/applications/${id}`}
        className={cn(
          "group transition-ui relative grid gap-y-3 px-4 py-4 sm:px-5",
          "hover:bg-canvas focus-visible:-outline-offset-2 focus-ring",
          applicationGrid
        )}
      >
        {/* Identity */}
        <div className="flex min-w-0 gap-3 pr-20 xl:pr-0">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-inset text-micro font-semibold tracking-wide text-ink-secondary"
          >
            {getInitials(company)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-meta font-medium text-ink-secondary">{company}</p>
            <p className="mt-0.5 line-clamp-2 text-body font-semibold text-ink">{role}</p>
            <p className="mt-1 flex items-center gap-1 text-meta text-ink-muted">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          </div>
        </div>

        {/* Fit + status: inline row below xl, separate grid cells on xl */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-12 xl:contents">
          <div>
            <FitBadge recommendation={recommendation} score={fitScore} />
          </div>
          <div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Preparation */}
        <div className="pl-12 xl:pl-0">
          {inPreparation ? (
            <ApplicationProgress
              cvStatus={cvStatus}
              coverLetterStatus={coverLetterStatus}
              questionsCompleted={questionsCompleted}
              questionsTotal={questionsTotal}
            />
          ) : (
            <span aria-hidden="true" className="hidden text-meta text-ink-muted xl:inline">
              —
            </span>
          )}
        </div>

        {/* Updated */}
        <p className="absolute right-4 top-4 text-meta text-ink-muted sm:right-5 xl:static xl:text-right">
          <span className="sr-only">Updated </span>
          {formatRelativeDate(updatedAt)}
        </p>

        {/* Affordance */}
        <span className="hidden justify-end xl:flex" aria-hidden="true">
          <ChevronRight className="transition-ui h-4 w-4 text-line-strong group-hover:translate-x-0.5 group-hover:text-ink-secondary" />
        </span>

        <span className="sr-only">
          Open application: {role} at {company}
        </span>
      </Link>
    </li>
  );
}
