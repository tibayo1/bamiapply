"use client";

import { useState } from "react";
import type { EducationRecord, VerificationStatus } from "@/types/profile";

interface EducationFormProps {
  initial?: Partial<EducationRecord>;
  onSubmit: (data: Partial<EducationRecord>) => void;
  formId?: string;
}

export function EducationForm({ initial, onSubmit, formId = "education-form" }: EducationFormProps) {
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [degree, setDegree] = useState(initial?.degree || "");
  const [fieldOfStudy, setFieldOfStudy] = useState(initial?.fieldOfStudy || "");
  const [startDate, setStartDate] = useState(initial?.startDate || "");
  const [endDate, setEndDate] = useState(initial?.endDate || "");
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent || false);
  const [location, setLocation] = useState(initial?.location || "");
  const [grade, setGrade] = useState(initial?.grade || "");
  const [thesisTitle, setThesisTitle] = useState(initial?.thesisTitle || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !degree.trim()) return;

    onSubmit({
      ...initial,
      institution: institution.trim(),
      degree: degree.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      startDate: startDate.trim() || undefined,
      endDate: isCurrent ? undefined : endDate.trim() || undefined,
      isCurrent,
      location: location.trim() || undefined,
      grade: grade.trim() || undefined,
      thesisTitle: thesisTitle.trim() || undefined,
      notes: notes.trim() || undefined,
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-inst" className="block text-meta font-medium text-ink">
            Institution <span className="text-danger">*</span>
          </label>
          <input
            id="edu-inst"
            required
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Kadir Has University"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edu-degree" className="block text-meta font-medium text-ink">
            Degree <span className="text-danger">*</span>
          </label>
          <input
            id="edu-degree"
            required
            type="text"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            placeholder="e.g. PhD, MSc, BSc"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="edu-field" className="block text-meta font-medium text-ink">
          Field of Study <span className="text-danger">*</span>
        </label>
        <input
          id="edu-field"
          required
          type="text"
          value={fieldOfStudy}
          onChange={(e) => setFieldOfStudy(e.target.value)}
          placeholder="e.g. Computational Science and Engineering"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="edu-start" className="block text-meta font-medium text-ink">
            Start Year
          </label>
          <input
            id="edu-start"
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="e.g. 2022"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edu-end" className="block text-meta font-medium text-ink">
            End Year
          </label>
          <input
            id="edu-end"
            type="text"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isCurrent}
            placeholder={isCurrent ? "Present" : "e.g. 2026"}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink disabled:opacity-50 focus:border-brand focus:bg-surface focus:outline-none"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="edu-current"
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-line-strong text-brand focus:ring-brand"
            />
            <label htmlFor="edu-current" className="text-micro text-ink-secondary">
              Currently studying
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="edu-loc" className="block text-meta font-medium text-ink">
            Location
          </label>
          <input
            id="edu-loc"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Istanbul, Türkiye"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="edu-thesis" className="block text-meta font-medium text-ink">
          Thesis / Dissertation Title (optional)
        </label>
        <input
          id="edu-thesis"
          type="text"
          value={thesisTitle}
          onChange={(e) => setThesisTitle(e.target.value)}
          placeholder="e.g. Psychophysical Modelling of Vibrotactile Sensory Discrimination"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-grade" className="block text-meta font-medium text-ink">
            Grade / GPA (optional)
          </label>
          <input
            id="edu-grade"
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g. 3.85 / 4.00"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edu-notes" className="block text-meta font-medium text-ink">
            Notes / Honors (optional)
          </label>
          <input
            id="edu-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Full Academic Scholarship"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="edu-status" className="block text-meta font-medium text-ink">
          Verification Status
        </label>
        <select
          id="edu-status"
          value={verificationStatus}
          onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        >
          <option value="verified">Verified</option>
          <option value="needs_confirmation">Needs confirmation</option>
          <option value="draft">Draft</option>
        </select>
      </div>
    </form>
  );
}
