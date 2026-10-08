"use client";

import { Award, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationLabel } from "./VerificationLabel";
import type { AchievementRecord, CareerProfile } from "@/types/profile";

interface AchievementsSectionProps {
  profile: CareerProfile;
  onAdd: () => void;
  onEdit: (record: AchievementRecord) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
}

export function AchievementsSection({
  profile,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
}: AchievementsSectionProps) {
  const { achievements } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            NOTABLE IMPACT &amp; MILESTONES
          </div>
          <h2 className="mt-1 text-heading font-semibold text-ink">
            Achievements
          </h2>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add achievement
        </Button>
      </div>

      {achievements.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No achievements added yet"
          description="Achievements exist as reusable standalone proof points. Metrics are always optional — strong qualitative impacts and process improvements are fully supported."
          action={
            <Button type="button" variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add your first achievement
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-ui hover:border-line-strong"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-body font-semibold text-ink">
                    {ach.title}
                  </h3>
                  <VerificationLabel
                    status={ach.verificationStatus}
                    onConfirm={
                      ach.verificationStatus !== "verified"
                        ? () => onConfirm(ach.id)
                        : undefined
                    }
                  />
                </div>

                <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                  {ach.description}
                </p>

                {/* Optional Metric Preserved Exactly */}
                {ach.metric?.value && (
                  <div className="mt-3 flex items-baseline gap-2 rounded-lg bg-inset/50 p-2.5 border border-line/60">
                    <span className="font-mono text-lg font-bold text-ink tabular-nums">
                      {ach.metric.value}
                    </span>
                    {ach.metric.context && (
                      <span className="text-micro text-ink-muted">
                        {ach.metric.context}
                      </span>
                    )}
                  </div>
                )}

                {ach.date && (
                  <p className="mt-2 font-mono text-micro text-ink-muted">
                    {ach.date}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-2.5 border-t border-line/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(ach)}
                  className="rounded p-1 text-ink-muted hover:text-ink hover:bg-ink/[0.04] transition-ui text-meta font-medium flex items-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(ach.id)}
                  className="rounded p-1 text-ink-muted hover:text-danger hover:bg-danger-subtle transition-ui text-meta font-medium flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
