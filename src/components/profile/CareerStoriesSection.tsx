"use client";

import { BookOpen, Plus, Pencil, Trash2, Tag, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationLabel } from "./VerificationLabel";
import type { CareerStory, CareerProfile } from "@/types/profile";

interface CareerStoriesSectionProps {
  profile: CareerProfile;
  onAdd: () => void;
  onEdit: (story: CareerStory) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
}

export function CareerStoriesSection({
  profile,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
}: CareerStoriesSectionProps) {
  const { careerStories } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            INTERVIEW &amp; APPLICATION NARRATIVES
          </div>
          <h2 className="mt-1 text-heading font-semibold text-ink">
            Career Stories
          </h2>
          <p className="mt-1 text-meta text-ink-muted">
            Structured STAR narratives used to answer behavioral questions, tailored cover letters, and technical deep-dives.
          </p>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add career story
        </Button>
      </div>

      {careerStories.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No career stories yet"
          description="Build reusable STAR stories (Situation, Task, Action, Result) linked to your real experiences. Bámi uses these to formulate high-conviction application answers without hallucination."
          action={
            <Button type="button" variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add your first career story
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {careerStories.map((story) => (
            <div
              key={story.id}
              className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition-ui hover:border-line-strong"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="text-body-lg font-semibold text-ink">
                    {story.title}
                  </h3>
                  {story.context && (
                    <p className="mt-1 text-meta text-ink-muted">
                      {story.context}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-start">
                  <VerificationLabel
                    status={story.verificationStatus}
                    onConfirm={
                      story.verificationStatus !== "verified"
                        ? () => onConfirm(story.id)
                        : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => onEdit(story)}
                    className="p-1.5 text-ink-muted hover:text-ink hover:bg-canvas rounded-md transition-ui"
                    title="Edit story"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(story.id)}
                    className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-subtle/50 rounded-md transition-ui"
                    title="Delete story"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Challenge / Objective */}
              {story.challenge && (
                <div className="mt-4 rounded-lg bg-inset/40 p-3 border border-line/60">
                  <span className="block font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                    Challenge &amp; Objective
                  </span>
                  <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
                    {story.challenge}
                  </p>
                </div>
              )}

              {/* Actions */}
              {story.actions && story.actions.length > 0 && (
                <div className="mt-4">
                  <span className="block font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                    Actions Taken
                  </span>
                  <ul className="mt-2 space-y-1.5 text-meta text-ink-secondary">
                    {story.actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Outcome */}
              {story.outcome && (
                <div className="mt-4 rounded-lg bg-success-subtle/40 p-3 border border-success/30">
                  <span className="block font-mono text-micro font-semibold uppercase tracking-wider text-success">
                    Outcome &amp; Result
                  </span>
                  <p className="mt-1 text-meta text-ink leading-relaxed">
                    {story.outcome}
                  </p>
                </div>
              )}

              {/* Tags: Demonstrates & Useful For */}
              <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center gap-4">
                {story.demonstrates && story.demonstrates.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span className="text-micro font-medium text-ink-muted mr-1">
                      Demonstrates:
                    </span>
                    {story.demonstrates.map((item, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-brand-subtle px-2 py-0.5 font-mono text-micro font-medium text-brand"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {story.usefulFor && story.usefulFor.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Compass className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-micro font-medium text-ink-muted mr-1">
                      Useful for:
                    </span>
                    {story.usefulFor.map((item, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-canvas px-2 py-0.5 text-micro font-medium text-ink-secondary border border-line"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
