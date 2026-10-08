"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { JobRequirement } from "@/types/analysis";
import { RequirementRow } from "./RequirementRow";

interface RequirementsBreakdownProps {
  requirements: JobRequirement[];
  onAddExperience?: (requirement: JobRequirement) => void;
}

type TabType = "all" | "core" | "preferred" | "context_eligibility";

export function RequirementsBreakdown({
  requirements,
  onAddExperience,
}: RequirementsBreakdownProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");

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
    <section aria-labelledby="breakdown-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            DETAILED EVIDENCE MAPPING
          </div>
          <h2 id="breakdown-heading" className="mt-1 text-heading font-semibold text-ink">
            Requirements breakdown
          </h2>
        </div>
        <p className="text-meta text-ink-muted">
          Click any requirement to inspect verified evidence or address gaps
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
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
    </section>
  );
}
