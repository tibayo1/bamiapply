"use client";

import { useState } from "react";
import { Briefcase, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationLabel } from "./VerificationLabel";
import type { CareerProfile, ExperienceRecord } from "@/types/profile";
import { cn } from "@/lib/utils";

interface ExperienceSectionProps {
  profile: CareerProfile;
  onAdd: () => void;
  onEdit: (record: ExperienceRecord) => void;
  onDelete: (id: string) => void;
  onConfirmRecord: (id: string) => void;
  onConfirmClaim: (recordId: string, claimId: string) => void;
}

export function ExperienceSection({
  profile,
  onAdd,
  onEdit,
  onDelete,
  onConfirmRecord,
  onConfirmClaim,
}: ExperienceSectionProps) {
  const { experiences, skills } = profile;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(experiences.map((e) => e.id)) // Default expanded
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSkillName = (id: string) =>
    skills.find((s) => s.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            CAREER EXPERIENCE
          </div>
          <h2 className="mt-1 text-heading font-semibold text-ink">
            Experience Records
          </h2>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add experience
        </Button>
      </div>

      {experiences.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No experience records added"
          description="Capture your roles, organizations, and verified responsibilities. Every application bullet will be excavated from these facts."
          action={
            <Button type="button" variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add your first role
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => {
            const isExpanded = expandedIds.has(exp.id);
            return (
              <div
                key={exp.id}
                className={cn(
                  "rounded-xl border transition-ui",
                  isExpanded
                    ? "border-line-strong bg-surface shadow-xs"
                    : "border-line bg-surface/70 hover:bg-surface"
                )}
              >
                {/* Header Card / Accordion Trigger */}
                <div className="flex items-start justify-between p-4 sm:p-5 gap-4">
                  <div
                    onClick={() => toggleExpand(exp.id)}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-body font-semibold text-ink">
                        {exp.title}
                      </h3>
                      <span className="text-meta font-medium text-ink-secondary">
                        · {exp.organization}
                      </span>
                      {exp.isCurrent && (
                        <span className="rounded bg-brand-subtle px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-brand">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
                      {exp.location && <span>{exp.location}</span>}
                      {exp.startDate && (
                        <span>
                          {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "N/A"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Verification */}
                  <div className="flex items-center gap-3 shrink-0">
                    <VerificationLabel
                      status={exp.verificationStatus}
                      onConfirm={
                        exp.verificationStatus !== "verified"
                          ? () => onConfirmRecord(exp.id)
                          : undefined
                      }
                    />

                    <div className="flex items-center gap-1 border-l border-line pl-2">
                      <button
                        type="button"
                        onClick={() => onEdit(exp)}
                        className="rounded p-1 text-ink-muted hover:text-ink hover:bg-ink/[0.04] transition-ui"
                        aria-label={`Edit ${exp.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(exp.id)}
                        className="rounded p-1 text-ink-muted hover:text-danger hover:bg-danger-subtle transition-ui"
                        aria-label={`Delete ${exp.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(exp.id)}
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
                    {exp.summary && (
                      <div>
                        <p className="text-meta text-ink-secondary leading-relaxed">
                          {exp.summary}
                        </p>
                      </div>
                    )}

                    {/* Factual Responsibilities & Claims */}
                    {exp.responsibilities.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block font-medium">
                          Responsibilities &amp; Verified Claims ({exp.responsibilities.length})
                        </span>
                        <ul className="space-y-2">
                          {exp.responsibilities.map((claim) => (
                            <li
                              key={claim.id}
                              className="flex items-start justify-between gap-3 rounded-lg bg-inset/50 p-2.5 border border-line/60 text-meta text-ink"
                            >
                              <div className="space-y-1">
                                <p className="leading-snug">{claim.text}</p>
                                {claim.derivedFromClaimId && (
                                  <span className="font-mono text-[0.625rem] text-brand block">
                                    Suggested phrasing based on original claim
                                  </span>
                                )}
                              </div>
                              <VerificationLabel
                                status={claim.verificationStatus}
                                size="sm"
                                onConfirm={
                                  claim.verificationStatus !== "verified"
                                    ? () => onConfirmClaim(exp.id, claim.id)
                                    : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Linked Skills Demonstrated */}
                    {exp.skillIds.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block font-medium">
                          Skills Demonstrated
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {exp.skillIds.map((skId) => (
                            <span
                              key={skId}
                              className="rounded bg-canvas border border-line px-2 py-0.5 text-micro font-medium text-ink-secondary"
                            >
                              {getSkillName(skId)}
                            </span>
                          ))}
                        </div>
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
