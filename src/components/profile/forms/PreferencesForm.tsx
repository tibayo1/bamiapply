"use client";

import { useState } from "react";
import type {
  CareerPreferences,
  RelocationPreference,
  SponsorshipNeed,
  WorkStyle,
} from "@/types/profile";
import { ListEditor } from "./ListEditor";

interface PreferencesFormProps {
  initial: CareerPreferences;
  onSubmit: (data: Partial<CareerPreferences>) => void;
  formId?: string;
}

export function PreferencesForm({
  initial,
  onSubmit,
  formId = "preferences-form",
}: PreferencesFormProps) {
  const [targetRoles, setTargetRoles] = useState<string[]>(
    initial.targetRoles || []
  );
  const [industries, setIndustries] = useState<string[]>(
    initial.industries || []
  );
  const [preferredLocations, setPreferredLocations] = useState<string[]>(
    initial.preferredLocations || []
  );
  const [workStyles, setWorkStyles] = useState<WorkStyle[]>(
    initial.workStyles || []
  );
  const [relocation, setRelocation] = useState<RelocationPreference | "">(
    initial.relocation || ""
  );
  const [sponsorshipNeed, setSponsorshipNeed] = useState<
    SponsorshipNeed | ""
  >(initial.sponsorshipNeed || "");

  const toggleWorkStyle = (style: WorkStyle) => {
    if (workStyles.includes(style)) {
      setWorkStyles(workStyles.filter((s) => s !== style));
    } else {
      setWorkStyles([...workStyles, style]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      targetRoles,
      industries,
      preferredLocations,
      workStyles,
      relocation: relocation ? (relocation as RelocationPreference) : undefined,
      sponsorshipNeed: sponsorshipNeed
        ? (sponsorshipNeed as SponsorshipNeed)
        : undefined,
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-lg bg-inset/60 p-3 border border-line text-meta text-ink-muted">
        <strong>Preferences vs. Facts:</strong> These settings describe what you are looking for in your next role. Factual work authorizations are configured separately in the Legal Status section.
      </div>

      <ListEditor
        label="Target Roles"
        description="Roles and job titles you are actively considering."
        placeholder="e.g. Clinical Scientist, R&D Engineer"
        items={targetRoles}
        onChange={setTargetRoles}
        addButtonLabel="Add role"
      />

      <ListEditor
        label="Target Industries"
        description="Sectors or verticals matching your career goals."
        placeholder="e.g. Medical devices, Digital health, HCI"
        items={industries}
        onChange={setIndustries}
        addButtonLabel="Add industry"
      />

      <ListEditor
        label="Preferred Geographic Locations"
        description="Cities, countries, or regions you prefer to work in."
        placeholder="e.g. Switzerland, Germany, Remote EU"
        items={preferredLocations}
        onChange={setPreferredLocations}
        addButtonLabel="Add location"
      />

      <div>
        <label className="block text-meta font-medium text-ink">
          Work Style Preferences
        </label>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-meta text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={workStyles.includes("on_site")}
              onChange={() => toggleWorkStyle("on_site")}
              className="rounded border-line-strong text-brand focus:ring-brand"
            />
            On-site
          </label>
          <label className="flex items-center gap-2 text-meta text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={workStyles.includes("hybrid")}
              onChange={() => toggleWorkStyle("hybrid")}
              className="rounded border-line-strong text-brand focus:ring-brand"
            />
            Hybrid
          </label>
          <label className="flex items-center gap-2 text-meta text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={workStyles.includes("remote")}
              onChange={() => toggleWorkStyle("remote")}
              className="rounded border-line-strong text-brand focus:ring-brand"
            />
            Remote
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pref-relo" className="block text-meta font-medium text-ink">
            Relocation Willingness
          </label>
          <select
            id="pref-relo"
            value={relocation}
            onChange={(e) =>
              setRelocation(e.target.value as RelocationPreference)
            }
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          >
            <option value="">Not specified</option>
            <option value="willing">Willing to relocate</option>
            <option value="not_willing">Not willing to relocate</option>
            <option value="depends">Depends on opportunity & package</option>
          </select>
        </div>

        <div>
          <label htmlFor="pref-spon" className="block text-meta font-medium text-ink">
            Visa Sponsorship Preference
          </label>
          <select
            id="pref-spon"
            value={sponsorshipNeed}
            onChange={(e) =>
              setSponsorshipNeed(e.target.value as SponsorshipNeed)
            }
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          >
            <option value="">Not specified</option>
            <option value="no_sponsorship_needed">
              Does not need sponsorship
            </option>
            <option value="needs_sponsorship">
              Requires visa sponsorship
            </option>
            <option value="depends">
              Depends on target country
            </option>
          </select>
        </div>
      </div>
    </form>
  );
}
