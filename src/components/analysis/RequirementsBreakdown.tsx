"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobRequirement } from "@/types/analysis";
import { RequirementRow } from "./RequirementRow";

interface RequirementsBreakdownProps {
  requirements: JobRequirement[];
  onAddExperience?: (requirement: JobRequirement) => void;
  children?: ReactNode;
}

type TabType = "all" | "core" | "preferred" | "context_eligibility";

export function RequirementsBreakdown({
  requirements,
  onAddExperience,
  children,
}: RequirementsBreakdownProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const headingId = useId();

  const coreItems = requirements.filter((r) => r.importance === "core");
  const preferredItems = requirements.filter((r) => r.importance === "preferred");
  const contextAndCritItems = requirements.filter(
    (r) => r.importance === "contextual" || r.importance === "critical"
  );

  const displayedItems =
    activeTab === "core"
      ? coreItems
      : activeTab === "preferred"
      ? preferredItems
      : activeTab === "context_eligibility"
      ? contextAndCritItems
      : requirements;

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "all", label: "All requirements", count: requirements.length },
    { id: "core", label: "Core requirements", count: coreItems.length },
    { id: "preferred", label: "Preferred", count: preferredItems.length },
    {
      id: "context_eligibility",
      label: "Context & eligibility",
      count: contextAndCritItems.length,
    },
  ];

  return (
    <section aria-labelledby={headingId}>
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <h2 id={headingId} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-heading font-semibold text-ink">
            <span>View detailed match</span>
            <span className="text-meta font-normal text-ink-muted">{requirements.length} {requirements.length === 1 ? "requirement" : "requirements"}</span>
          </h2>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t border-line p-4 sm:p-5">
          <div>
            <h3 className="text-body font-semibold text-ink">Requirements &amp; Profile evidence</h3>
            <p className="mt-1 text-meta text-ink-muted">Open a requirement to review its source wording and linked evidence.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "focus-ring transition-ui inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-meta font-medium",
                    isActive
                      ? "bg-surface text-ink shadow-xs border border-line-strong font-semibold"
                      : "text-ink-secondary hover:text-ink hover:bg-surface/50"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 font-mono text-[0.6875rem] tabular-nums",
                      isActive
                        ? "bg-brand-subtle text-brand font-semibold"
                        : "bg-inset text-ink-muted"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-meta text-ink-muted">
            Missing links show what this assessment cannot support yet; they do not prove you lack the experience.
          </p>

          {/* Expandable list */}
          <div className="space-y-2.5">
            {displayedItems.map((req) => (
              <RequirementRow
                key={req.id}
                requirement={req}
                onAddExperience={onAddExperience}
              />
            ))}
          </div>
          {children}
        </div>
      </details>
    </section>
  );
}
