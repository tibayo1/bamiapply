"use client";

import { useState } from "react";
import { Wrench, Plus, Pencil, Trash2, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationLabel } from "./VerificationLabel";
import { getEvidenceForSkill } from "@/lib/profile/selectors";
import type { CareerProfile, SkillRecord } from "@/types/profile";

interface SkillsSectionProps {
  profile: CareerProfile;
  onAdd: () => void;
  onEdit: (record: SkillRecord) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
}

export function SkillsSection({
  profile,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
}: SkillsSectionProps) {
  const { skills } = profile;
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { key: "all", label: "All Skills" },
    { key: "research", label: "Research" },
    { key: "technical", label: "Technical" },
    { key: "software", label: "Software" },
    { key: "engineering", label: "Engineering" },
    { key: "professional", label: "Professional" },
  ];

  const filteredSkills =
    selectedCategory === "all"
      ? skills
      : skills.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            EVIDENCE-LINKED CAPABILITIES
          </div>
          <h2 className="mt-1 text-heading font-semibold text-ink">
            Skills &amp; Competencies
          </h2>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add skill
        </Button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setSelectedCategory(c.key)}
            className={`rounded-md px-2.5 py-1 text-meta font-medium transition-ui ${
              selectedCategory === c.key
                ? "bg-ink text-canvas font-semibold"
                : "bg-surface text-ink-secondary hover:bg-inset hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filteredSkills.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No skills found in this category"
          description="Bámi ties skills to verified project and experience records so employers know where each capability was demonstrated."
          action={
            <Button type="button" variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add a skill
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredSkills.map((sk) => {
            const evidence = getEvidenceForSkill(profile, sk.id, {
              includeUnverified: true,
            });

            return (
              <div
                key={sk.id}
                className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col justify-between transition-ui hover:border-line-strong"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-body font-semibold text-ink">
                        {sk.name}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-micro text-ink-muted uppercase">
                          {sk.category}
                        </span>
                        {sk.level && (
                          <span className="text-micro text-ink-muted">
                            · {sk.level}
                          </span>
                        )}
                      </div>
                    </div>

                    <VerificationLabel
                      status={sk.verificationStatus}
                      onConfirm={
                        sk.verificationStatus !== "verified"
                          ? () => onConfirm(sk.id)
                          : undefined
                      }
                    />
                  </div>

                  {/* Connected Evidence List */}
                  <div className="mt-3.5 space-y-1.5 border-t border-line/60 pt-3">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-muted flex items-center gap-1 font-medium">
                      <LinkIcon className="h-3 w-3 text-brand" />
                      Demonstrated In ({evidence.length}):
                    </span>

                    {evidence.length > 0 ? (
                      <ul className="space-y-1">
                        {evidence.map((ev, idx) => (
                          <li
                            key={idx}
                            className="text-meta text-ink-secondary flex items-baseline gap-1.5 bg-inset/40 rounded px-2 py-1"
                          >
                            <CheckCircle2 className="h-3 w-3 text-success shrink-0 translate-y-0.5" />
                            <span className="truncate font-medium text-ink">
                              {ev.recordTitle}
                            </span>
                            {ev.organization && (
                              <span className="text-micro text-ink-muted truncate">
                                ({ev.organization})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-meta text-ink-muted italic bg-inset/20 rounded px-2 py-1">
                        Self-reported · No supporting records linked yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit / Delete Footer */}
                <div className="mt-4 pt-2.5 border-t border-line/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(sk)}
                    className="rounded p-1 text-ink-muted hover:text-ink hover:bg-ink/[0.04] transition-ui text-meta font-medium flex items-center gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(sk.id)}
                    className="rounded p-1 text-ink-muted hover:text-danger hover:bg-danger-subtle transition-ui text-meta font-medium flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
