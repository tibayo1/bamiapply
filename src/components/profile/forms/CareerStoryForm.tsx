"use client";

import { useState } from "react";
import type { CareerStory, VerificationStatus } from "@/types/profile";
import { ListEditor } from "./ListEditor";

interface CareerStoryFormProps {
  initial?: Partial<CareerStory>;
  onSubmit: (data: Partial<CareerStory>) => void;
  formId?: string;
}

export function CareerStoryForm({
  initial,
  onSubmit,
  formId = "story-form",
}: CareerStoryFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [context, setContext] = useState(initial?.context || "");
  const [challenge, setChallenge] = useState(initial?.challenge || "");
  const [outcome, setOutcome] = useState(initial?.outcome || "");
  const [actions, setActions] = useState<string[]>(initial?.actions || []);
  const [demonstrates, setDemonstrates] = useState<string[]>(
    initial?.demonstrates || []
  );
  const [usefulFor, setUsefulFor] = useState<string[]>(
    initial?.usefulFor || []
  );
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      ...initial,
      title: title.trim(),
      context: context.trim() || undefined,
      challenge: challenge.trim() || undefined,
      outcome: outcome.trim() || undefined,
      actions,
      demonstrates,
      usefulFor,
      skillIds: initial?.skillIds || [],
      evidenceLinks: initial?.evidenceLinks || [],
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="story-title" className="block text-meta font-medium text-ink">
          Story Title <span className="text-danger">*</span>
        </label>
        <input
          id="story-title"
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Haptic VR Stiffness Study"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="story-ctx" className="block text-meta font-medium text-ink">
          Context & Role
        </label>
        <textarea
          id="story-ctx"
          rows={2}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Where were you working, what was the setup?"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="story-chal" className="block text-meta font-medium text-ink">
          Challenge or Objective
        </label>
        <textarea
          id="story-chal"
          rows={2}
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          placeholder="What was the specific difficulty, question, or goal?"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <ListEditor
        label="What I Did (Actions)"
        description="Key decisions, methods, or engineering steps you took."
        placeholder="e.g. Designed controlled experimental protocol..."
        items={actions}
        onChange={setActions}
        addButtonLabel="Add action"
      />

      <div>
        <label htmlFor="story-out" className="block text-meta font-medium text-ink">
          Outcome or Result
        </label>
        <textarea
          id="story-out"
          rows={2}
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="What was the result or what was delivered?"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <ListEditor
        label="What this demonstrates"
        description="Competencies proven by this story (e.g. Research design, Problem solving)."
        placeholder="e.g. Research methodology, Technical problem solving"
        items={demonstrates}
        onChange={setDemonstrates}
        addButtonLabel="Add competency"
      />

      <ListEditor
        label="Useful for (Interview / Application topics)"
        description="Topics or question types this story answers well."
        placeholder="e.g. Complex project, Methodological challenge, Working under constraints"
        items={usefulFor}
        onChange={setUsefulFor}
        addButtonLabel="Add topic"
      />

      <div>
        <label htmlFor="story-status" className="block text-meta font-medium text-ink">
          Verification Status
        </label>
        <select
          id="story-status"
          value={verificationStatus}
          onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        >
          <option value="verified">Verified (Ready to use in applications)</option>
          <option value="needs_confirmation">Needs confirmation</option>
          <option value="draft">Draft</option>
        </select>
      </div>
    </form>
  );
}
