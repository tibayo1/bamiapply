"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowRight, ArrowUpDown, Briefcase, Check, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterApplications,
  getStatusCounts,
  sortApplications,
  sortLabels,
} from "@/lib/applications";
import { ApplicationCard, applicationGrid } from "@/components/ui/ApplicationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button, buttonVariants } from "@/components/ui/Button";
import type { Application, ApplicationFilter, ApplicationSort } from "@/types/application";

interface ApplicationsExplorerProps {
  /** Pass real rows from the database later; mock data is injected by the page. */
  applications: Application[];
  /** Show only the first N rows and a "View all" link (dashboard). */
  limit?: number;
  viewAllHref?: string;
}

function SortMenu({
  value,
  onChange,
}: {
  value: ApplicationSort;
  onChange: (v: ApplicationSort) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label={`Sort applications. Currently: ${sortLabels[value]}`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "md" }),
            "gap-1.5 px-3 text-meta data-[state=open]:bg-inset"
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          <span className="hidden sm:inline">{sortLabels[value]}</span>
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          className="menu-surface z-50 w-48 rounded-lg border border-line bg-surface p-1 shadow-float"
        >
          <Menu.Label className="px-2 pb-1 pt-1.5 text-micro font-medium text-ink-muted">
            Sort by
          </Menu.Label>
          <Menu.RadioGroup value={value} onValueChange={(v) => onChange(v as ApplicationSort)}>
            {(Object.keys(sortLabels) as ApplicationSort[]).map((key) => (
              <Menu.RadioItem
                key={key}
                value={key}
                className="transition-ui flex h-8 cursor-default items-center justify-between rounded-md px-2 text-body text-ink outline-none select-none data-[highlighted]:bg-inset"
              >
                {sortLabels[key]}
                <Menu.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * ApplicationsExplorer — tabs, search, sort and the record list, in one
 * place so the Dashboard and the Applications page behave identically.
 */
export function ApplicationsExplorer({
  applications,
  limit,
  viewAllHref = "/applications",
}: ApplicationsExplorerProps) {
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ApplicationSort>("updated");

  const counts = useMemo(() => getStatusCounts(applications), [applications]);
  const results = useMemo(
    () => sortApplications(filterApplications(applications, filter, query), sort),
    [applications, filter, query, sort]
  );
  const visible = limit ? results.slice(0, limit) : results;
  const hidden = results.length - visible.length;

  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "preparing", label: "Preparing", count: counts.preparing },
    { key: "applied", label: "Applied", count: counts.applied },
    { key: "interviews", label: "Interviews", count: counts.interviews },
    { key: "offers", label: "Offers", count: counts.offers },
  ] satisfies { key: ApplicationFilter; label: string; count: number }[];

  const clear = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between">
        <FilterTabs
          ariaLabel="Filter applications by status"
          items={tabs}
          active={filter}
          onChange={setFilter}
          className="-mx-2.5"
        />
        <div className="flex items-center gap-2 pb-2.5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search company, role or location"
            label="Search applications"
            className="min-w-0 flex-1 sm:w-72 sm:flex-none"
          />
          <SortMenu value={sort} onChange={setSort} />
        </div>
      </div>

      <p className="sr-only" role="status">
        {results.length} {results.length === 1 ? "application" : "applications"} shown
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Analyse your first opportunity and Bámi will keep everything organised here."
            action={
              <Link href="/dashboard#job-input" className={buttonVariants({ variant: "primary" })}>
                Analyse a job
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No matching applications"
            description="Nothing fits those filters. Try a different search or status."
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "hidden border-b border-line bg-canvas/70 px-5 py-2 text-micro font-medium text-ink-muted",
                applicationGrid
              )}
            >
              <span className="pl-12">Role</span>
              <span>Fit</span>
              <span>Status</span>
              <span>Preparation</span>
              <span className="text-right">Updated</span>
              <span />
            </div>
            <ul aria-label="Applications">
              {visible.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </ul>
          </>
        )}
      </div>

      {hidden > 0 && (
        <Link
          href={viewAllHref}
          className="focus-ring transition-ui mt-4 inline-flex items-center gap-1.5 rounded-sm text-meta font-medium text-brand hover:text-brand-hover"
        >
          <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          View all {results.length} applications
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
