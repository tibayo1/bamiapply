"use client";

import { useState } from "react";
import type { ExperienceRecord, ProfileClaim, VerificationStatus } from "@/types/profile";
import { ListEditor } from "./ListEditor";

interface ExperienceFormProps {
  initial?: Partial<ExperienceRecord>;
  onSubmit: (data: Partial<ExperienceRecord>) => void;
  formId?: string;
}

export function ExperienceForm({ initial, onSubmit, formId = "experience-form" }: ExperienceFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [organization, setOrganization] = useState(initial?.organization || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [startDate, setStartDate] = useState(initial?.startDate || "");
  const [endDate, setEndDate] = useState(initial?.endDate || "");
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent || false);
  const [summary, setSummary] = useState(initial?.summary || "");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  // Responsibilities as strings
  const [responsibilities, setResponsibilities] = useState<string[]>(
    initial?.responsibilities?.map((r) => r.text) || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !organization.trim()) return;

    // Convert responsibility strings back to ProfileClaims
    const existingClaims = initial?.responsibilities || [];
    const claims: ProfileClaim[] = responsibilities.map((text, idx) => {
      const existing = existingClaims[idx];
      return {
        id: existing?.id || `claim-exp-${Date.now()}-${idx}`,
        text,
        verificationStatus,
        source: existing?.source || "user",
        sourceRecordId: initial?.id,
      };
    });

    onSubmit({
      ...initial,
      title: title.trim(),
      organization: organization.trim(),
      location: location.trim() || undefined,
      startDate: startDate.trim() || undefined,
      endDate: isCurrent ? undefined : endDate.trim() || undefined,
      isCurrent,
      summary: summary.trim() || undefined,
      responsibilities: claims,
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="exp-title" className="block text-meta font-medium text-ink">
            Job Title <span className="text-danger">*</span>
          </label>
          <input
            id="exp-title"
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Biomedical Engineer"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-org" className="block text-meta font-medium text-ink">
            Organization <span className="text-danger">*</span>
          </label>
          <input
            id="exp-org"
            required
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Marigold Hospital"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="exp-loc" className="block text-meta font-medium text-ink">
            Location
          </label>
          <input
            id="exp-loc"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Istanbul, Türkiye"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-start" className="block text-meta font-medium text-ink">
            Start Date / Year
          </label>
          <input
            id="exp-start"
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="e.g. 2022"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-end" className="block text-meta font-medium text-ink">
            End Date / Year
          </label>
          <input
            id="exp-end"
            type="text"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isCurrent}
            placeholder={isCurrent ? "Present" : "e.g. 2024"}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink disabled:opacity-50 focus:border-brand focus:bg-surface focus:outline-none"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="exp-current"
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-line-strong text-brand focus:ring-brand"
            />
            <label htmlFor="exp-current" className="text-micro text-ink-secondary">
              Current position
            </label>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="exp-summary" className="block text-meta font-medium text-ink">
          Role Summary
        </label>
        <textarea
          id="exp-summary"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief summary of your primary scope and context..."
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <ListEditor
        label="Responsibilities & Factual Claims"
        description="Add key responsibilities and verifiable statements. Capture facts first."
        placeholder="e.g. Maintained biomedical monitoring systems..."
        items={responsibilities}
        onChange={setResponsibilities}
        addButtonLabel="Add responsibility"
      />

      <div>
        <label htmlFor="exp-status" className="block text-meta font-medium text-ink">
          Verification Status
        </label>
        <select
          id="exp-status"
          value={verificationStatus}
          onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        >
          <option value="verified">Verified (Confirmed by you — usable as evidence)</option>
          <option value="needs_confirmation">Needs confirmation (Imported or pending review)</option>
          <option value="draft">Draft (Work in progress)</option>
        </select>
        <p className="mt-1 text-micro text-ink-muted">
          Only verified records are presented as proof during job analysis and application tailoring.
        </p>
      </div>
    </form>
  );
}
