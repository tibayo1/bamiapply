"use client";

import { useState } from "react";
import type { AchievementRecord, VerificationStatus } from "@/types/profile";

interface AchievementFormProps {
  initial?: Partial<AchievementRecord>;
  onSubmit: (data: Partial<AchievementRecord>) => void;
  formId?: string;
}

export function AchievementForm({
  initial,
  onSubmit,
  formId = "achievement-form",
}: AchievementFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [metricValue, setMetricValue] = useState(initial?.metric?.value || "");
  const [metricContext, setMetricContext] = useState(
    initial?.metric?.context || ""
  );
  const [date, setDate] = useState(initial?.date || "");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const metric =
      metricValue.trim()
        ? {
            value: metricValue.trim(),
            context: metricContext.trim() || undefined,
          }
        : undefined;

    onSubmit({
      ...initial,
      title: title.trim(),
      description: description.trim(),
      metric,
      date: date.trim() || undefined,
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="ach-title" className="block text-meta font-medium text-ink">
          Achievement Title <span className="text-danger">*</span>
        </label>
        <input
          id="ach-title"
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Published study findings or led equipment reliability initiative"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="ach-desc" className="block text-meta font-medium text-ink">
          Description & Context <span className="text-danger">*</span>
        </label>
        <textarea
          id="ach-desc"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what occurred, who was impacted, and what made it notable..."
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ach-val" className="block text-meta font-medium text-ink">
            Quantitative Metric (Optional)
          </label>
          <input
            id="ach-val"
            type="text"
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
            placeholder="e.g. 15% reduction or 40+ hours"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
          <p className="mt-1 text-micro text-ink-muted">
            Never required. Qualitative achievements are fully supported.
          </p>
        </div>

        <div>
          <label htmlFor="ach-ctx" className="block text-meta font-medium text-ink">
            Metric Context (Optional)
          </label>
          <input
            id="ach-ctx"
            type="text"
            value={metricContext}
            onChange={(e) => setMetricContext(e.target.value)}
            placeholder="e.g. compared to previous quarter"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ach-date" className="block text-meta font-medium text-ink">
            Date / Year (Optional)
          </label>
          <input
            id="ach-date"
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="e.g. 2024"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="ach-status" className="block text-meta font-medium text-ink">
            Verification Status
          </label>
          <select
            id="ach-status"
            value={verificationStatus}
            onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          >
            <option value="verified">Verified</option>
            <option value="needs_confirmation">Needs confirmation</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>
    </form>
  );
}
