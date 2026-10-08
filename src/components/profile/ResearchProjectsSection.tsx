"use client";

import { useState } from "react";
import { Beaker, ChevronDown, Plus, Pencil, Trash2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationLabel } from "./VerificationLabel";
import type { CareerProfile, ResearchProjectRecord } from "@/types/profile";
import { cn } from "@/lib/utils";

interface ResearchProjectsSectionProps {
  profile: CareerProfile;
  onAdd: () => void;
  onEdit: (record: ResearchProjectRecord) => void;
  onDelete: (id: string) => void;
  onConfirmRecord: (id: string) => void;
  onConfirmClaim: (recordId: string, claimId: string) => void;
}

export function ResearchProjectsSection({
  profile,
  onAdd,
  onEdit,
  onDelete,
  onConfirmRecord,
  onConfirmClaim,
}: ResearchProjectsSectionProps) {
  const { researchProjects } = profile;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(researchProjects.map((p) => p.id))
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            INVESTIGATION &amp; ENGINEERING
          </div>
          <h2 className="mt-1 text-heading font-semibold text-ink">
            Research &amp; Technical Projects
          </h2>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add project
        </Button>
      </div>

      {researchProjects.length === 0 ? (
        <EmptyState
          icon={Beaker}
          title="No research or technical projects"
          description="Document clinical studies, experimental research, engineering apparatus or software systems. Crucial for technical and scientific roles."
          action={
            <Button type="button" variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add research project
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {researchProjects.map((proj) => {
            const isExpanded = expandedIds.has(proj.id);
            return (
              <div
                key={proj.id}
                className={cn(
                  "rounded-xl border transition-ui",
                  isExpanded
                    ? "border-line-strong bg-surface shadow-xs"
                    : "border-line bg-surface/70 hover:bg-surface"
                )}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between p-4 sm:p-5 gap-4">
                  <div
                    onClick={() => toggleExpand(proj.id)}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-body font-semibold text-ink">
                        {proj.title}
                      </h3>
                      <span className="rounded bg-inset px-2 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-secondary">
                        {proj.projectType}
                      </span>
                    </div>

                    {proj.organization && (
                      <p className="mt-1 text-meta text-ink-muted">
                        {proj.organization}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <VerificationLabel
                      status={proj.verificationStatus}
                      onConfirm={
                        proj.verificationStatus !== "verified"
                          ? () => onConfirmRecord(proj.id)
                          : undefined
                      }
                    />

                    <div className="flex items-center gap-1 border-l border-line pl-2">
                      <button
                        type="button"
                        onClick={() => onEdit(proj)}
                        className="rounded p-1 text-ink-muted hover:text-ink hover:bg-ink/[0.04] transition-ui"
                        aria-label={`Edit ${proj.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(proj.id)}
                        className="rounded p-1 text-ink-muted hover:text-danger hover:bg-danger-subtle transition-ui"
                        aria-label={`Delete ${proj.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(proj.id)}
                        className="rounded p-1 text-ink-muted hover:text-ink transition-ui"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-line px-5 py-4 space-y-4 bg-surface/50">
                    {proj.objective && (
                      <div>
                        <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block font-medium">
                          Objective &amp; Problem
                        </span>
                        <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
                          {proj.objective}
                        </p>
                      </div>
                    )}

                    {/* Methods & Technologies */}
                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      {proj.methods.length > 0 && (
                        <div>
                          <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block font-medium">
                            Methods &amp; Paradigms
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {proj.methods.map((m, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-canvas border border-line px-2 py-0.5 text-micro font-medium text-ink"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {proj.technologies.length > 0 && (
                        <div>
                          <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block font-medium flex items-center gap-1">
                            <Cpu className="h-3 w-3 text-brand" />
                            Technologies &amp; Tools
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {proj.technologies.map((t, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-canvas border border-line px-2 py-0.5 text-micro font-medium text-ink"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Outcomes / Claims */}
                    {proj.outcomes.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block font-medium">
                          Verified Findings &amp; Outcomes
                        </span>
                        <ul className="space-y-2">
                          {proj.outcomes.map((claim) => (
                            <li
                              key={claim.id}
                              className="flex items-start justify-between gap-3 rounded-lg bg-inset/50 p-2.5 border border-line/60 text-meta text-ink"
                            >
                              <p className="leading-snug">{claim.text}</p>
                              <VerificationLabel
                                status={claim.verificationStatus}
                                size="sm"
                                onConfirm={
                                  claim.verificationStatus !== "verified"
                                    ? () => onConfirmClaim(proj.id, claim.id)
                                    : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
