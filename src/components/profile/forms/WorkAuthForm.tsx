"use client";

import { useState } from "react";
import type { VerificationStatus, WorkAuthorization } from "@/types/profile";

interface WorkAuthFormProps {
  initial?: Partial<WorkAuthorization>;
  onSubmit: (data: Partial<WorkAuthorization>) => void;
  formId?: string;
}

export function WorkAuthForm({
  initial,
  onSubmit,
  formId = "work-auth-form",
}: WorkAuthFormProps) {
  const [countryOrRegion, setCountryOrRegion] = useState(
    initial?.countryOrRegion || ""
  );
  const [status, setStatus] = useState<WorkAuthorization["status"]>(
    initial?.status || "authorized"
  );
  const [authorizationType, setAuthorizationType] = useState(
    initial?.authorizationType || ""
  );
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt || "");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryOrRegion.trim()) return;

    onSubmit({
      ...initial,
      countryOrRegion: countryOrRegion.trim(),
      status,
      authorizationType: authorizationType.trim() || undefined,
      expiresAt: expiresAt.trim() || undefined,
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="auth-country" className="block text-meta font-medium text-ink">
          Country or Region <span className="text-danger">*</span>
        </label>
        <input
          id="auth-country"
          required
          type="text"
          value={countryOrRegion}
          onChange={(e) => setCountryOrRegion(e.target.value)}
          placeholder="e.g. Switzerland / EU / EFTA, United Kingdom, Türkiye"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
        <p className="mt-1 text-micro text-ink-muted">
          This factual entry directly gates eligibility in Job Analysis.
        </p>
      </div>

      <div>
        <label htmlFor="auth-status" className="block text-meta font-medium text-ink">
          Work Authorization Status <span className="text-danger">*</span>
        </label>
        <select
          id="auth-status"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as WorkAuthorization["status"])
          }
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        >
          <option value="authorized">
            Authorized to work (Citizen, PR, or Valid Permit — no sponsorship needed)
          </option>
          <option value="requires_sponsorship">
            Requires visa sponsorship to work here
          </option>
          <option value="unknown">
            Unknown / Not yet confirmed
          </option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="auth-type" className="block text-meta font-medium text-ink">
            Permit or Passport Type (Optional)
          </label>
          <input
            id="auth-type"
            type="text"
            value={authorizationType}
            onChange={(e) => setAuthorizationType(e.target.value)}
            placeholder="e.g. B Permit, EU Citizen, Student Work Rights"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="auth-exp" className="block text-meta font-medium text-ink">
            Expiration Date (Optional)
          </label>
          <input
            id="auth-exp"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="auth-ver" className="block text-meta font-medium text-ink">
          Verification Status
        </label>
        <select
          id="auth-ver"
          value={verificationStatus}
          onChange={(e) =>
            setVerificationStatus(e.target.value as VerificationStatus)
          }
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        >
          <option value="verified">Verified (Confirmed by you)</option>
          <option value="needs_confirmation">Needs confirmation</option>
          <option value="draft">Draft</option>
        </select>
      </div>
    </form>
  );
}
