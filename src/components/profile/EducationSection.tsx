"use client";

import { GraduationCap, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationLabel } from "./VerificationLabel";
import type { CareerProfile, EducationRecord } from "@/types/profile";

interface EducationSectionProps {
  profile: CareerProfile;
  onAdd: () => void;
  onEdit: (record: EducationRecord) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
}

export function EducationSection({
  profile,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
}: EducationSectionProps) {
  const { education } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            ACADEMIC BACKGROUND
          </div>
          <h2 className="mt-1 text-heading font-semibold text-ink">
            Education &amp; Degrees
          </h2>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add education
        </Button>
      </div>

      {education.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No education records added"
          description="Degrees, formal training, and thesis work are foundational evidence for specialized technical requirements."
          action={
            <Button type="button" variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add education
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {education.map((edu) => (
            <div
              key={edu.id}
              className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs transition-ui hover:border-line-strong flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-body font-semibold text-ink">
                    {edu.degree} — {edu.fieldOfStudy}
                  </h3>
                  {edu.isCurrent && (
                    <span className="rounded bg-brand-subtle px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-brand">
                      In Progress
                    </span>
                  )}
                </div>

                <div className="text-meta text-ink-secondary">
                  <span>{edu.institution}</span>
                  {edu.location && <span> · {edu.location}</span>}
                </div>

                {edu.startDate && (
                  <p className="font-mono text-micro text-ink-muted">
                    {edu.startDate} – {edu.isCurrent ? "Present" : edu.endDate || ""}
                  </p>
                )}

                {edu.thesisTitle && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-inset/50 p-2.5 border border-line/60 text-meta text-ink-secondary">
                    <BookOpen className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono text-micro uppercase tracking-wider text-ink-muted block">
                        Thesis / Dissertation
                      </span>
                      <span className="italic">&ldquo;{edu.thesisTitle}&rdquo;</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                <VerificationLabel
                  status={edu.verificationStatus}
                  onConfirm={
                    edu.verificationStatus !== "verified"
                      ? () => onConfirm(edu.id)
                      : undefined
                  }
                />
                <div className="flex items-center gap-1 border-l border-line pl-2">
                  <button
                    type="button"
                    onClick={() => onEdit(edu)}
                    className="rounded p-1 text-ink-muted hover:text-ink hover:bg-ink/[0.04] transition-ui"
                    aria-label={`Edit ${edu.degree}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(edu.id)}
                    className="rounded p-1 text-ink-muted hover:text-danger hover:bg-danger-subtle transition-ui"
                    aria-label={`Delete ${edu.degree}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
