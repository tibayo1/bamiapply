"use client";

import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Sliders,
  MapPin,
  Briefcase,
  Globe2,
  Building2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VerificationLabel } from "./VerificationLabel";
import type { CareerProfile, WorkAuthorization } from "@/types/profile";

interface PreferencesSectionProps {
  profile: CareerProfile;
  onAddWorkAuth: () => void;
  onEditWorkAuth: (record: WorkAuthorization) => void;
  onDeleteWorkAuth: (id: string) => void;
  onConfirmWorkAuth: (id: string) => void;
  onEditPreferences: () => void;
}

export function PreferencesSection({
  profile,
  onAddWorkAuth,
  onEditWorkAuth,
  onDeleteWorkAuth,
  onConfirmWorkAuth,
  onEditPreferences,
}: PreferencesSectionProps) {
  const { workAuthorizations, preferences } = profile;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
          <span className="font-bold text-brand mr-0.5">/</span>
          FACTUAL ELIGIBILITY &amp; ASPIRATIONS
        </div>
        <h2 className="mt-1 text-heading font-semibold text-ink">
          Legal Status &amp; Career Preferences
        </h2>
        <p className="mt-1 text-meta text-ink-muted">
          Bámi strictly separates hard legal facts (which gate job deal-breakers) from your personal career aspirations (which shape fit commentary).
        </p>
      </div>

      {/* ── CARD 1: FACTUAL LEGAL STATUS ──────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand" />
              <h3 className="text-body-lg font-semibold text-ink">
                Factual Legal Status
              </h3>
              <span className="rounded-full bg-brand-subtle px-2 py-0.5 font-mono text-micro font-medium text-brand">
                Critical Gating Data
              </span>
            </div>
            <p className="mt-1 text-meta text-ink-muted">
              Where you hold legal authorization to work. Used by Bámi&apos;s deterministic engine to evaluate job eligibility rules.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAddWorkAuth}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add jurisdiction
          </Button>
        </div>

        {/* Legal status list */}
        {workAuthorizations.length === 0 ? (
          <div className="py-6 text-center text-meta text-ink-muted">
            <p>No work authorizations recorded.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAddWorkAuth}
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add primary jurisdiction
            </Button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {workAuthorizations.map((auth) => (
              <div
                key={auth.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-body text-ink">
                      {auth.countryOrRegion}
                    </span>
                    {auth.status === "authorized" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-micro font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Authorized
                      </span>
                    )}
                    {auth.status === "requires_sponsorship" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2 py-0.5 text-micro font-medium text-warning">
                        <AlertCircle className="h-3 w-3" />
                        Requires Sponsorship
                      </span>
                    )}
                    {auth.status === "unknown" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-micro font-medium text-ink-muted">
                        <HelpCircle className="h-3 w-3" />
                        Unknown / Needs Confirmation
                      </span>
                    )}
                    <VerificationLabel
                      status={auth.verificationStatus}
                      onConfirm={
                        auth.verificationStatus !== "verified"
                          ? () => onConfirmWorkAuth(auth.id)
                          : undefined
                      }
                    />
                  </div>
                  {auth.authorizationType && (
                    <p className="text-meta text-ink-secondary">
                      Type: {auth.authorizationType}
                      {auth.expiresAt && ` · Valid through: ${auth.expiresAt}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onEditWorkAuth(auth)}
                    className="p-1.5 text-ink-muted hover:text-ink hover:bg-canvas rounded-md transition-ui"
                    title="Edit record"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteWorkAuth(auth.id)}
                    className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-subtle/50 rounded-md transition-ui"
                    title="Delete record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg bg-inset/50 p-3 border border-line/60 text-micro text-ink-muted flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <span>
            <strong>Deterministic Deal-Breaker Rule:</strong> If an opportunity requires EU/Swiss citizenship or an active local permit, having an unconfirmed or sponsorship-requiring status flags a critical deal-breaker in Job Analysis.
          </span>
        </div>
      </div>

      {/* ── CARD 2: CAREER PREFERENCES ────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-accent" />
              <h3 className="text-body-lg font-semibold text-ink">
                Career Preferences
              </h3>
              <span className="rounded-full bg-accent-subtle px-2 py-0.5 font-mono text-micro font-medium text-accent">
                Aspirational / Non-Gating
              </span>
            </div>
            <p className="mt-1 text-meta text-ink-muted">
              What kind of opportunities you want. Shapes Bámi&apos;s fit commentary and role suggestions, but never disqualifies an application.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onEditPreferences}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit preferences
          </Button>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {/* Target roles */}
          <div>
            <div className="flex items-center gap-1.5 text-meta font-medium text-ink">
              <Briefcase className="h-4 w-4 text-brand" />
              <span>Target Roles</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferences.targetRoles?.length > 0 ? (
                preferences.targetRoles.map((role, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-canvas px-2.5 py-1 font-mono text-micro font-medium text-ink border border-line"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-micro text-ink-muted">None specified</span>
              )}
            </div>
          </div>

          {/* Preferred locations */}
          <div>
            <div className="flex items-center gap-1.5 text-meta font-medium text-ink">
              <MapPin className="h-4 w-4 text-brand" />
              <span>Preferred Locations</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferences.preferredLocations?.length > 0 ? (
                preferences.preferredLocations.map((loc, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-canvas px-2.5 py-1 text-micro font-medium text-ink border border-line"
                  >
                    {loc}
                  </span>
                ))
              ) : (
                <span className="text-micro text-ink-muted">None specified</span>
              )}
            </div>
          </div>

          {/* Work styles */}
          <div>
            <div className="flex items-center gap-1.5 text-meta font-medium text-ink">
              <Globe2 className="h-4 w-4 text-brand" />
              <span>Work Style</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferences.workStyles?.length > 0 ? (
                preferences.workStyles.map((style, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-brand-subtle px-2.5 py-1 font-mono text-micro font-medium text-brand capitalize"
                  >
                    {style.replace("_", "-")}
                  </span>
                ))
              ) : (
                <span className="text-micro text-ink-muted">Any work style</span>
              )}
            </div>
          </div>

          {/* Target industries */}
          <div>
            <div className="flex items-center gap-1.5 text-meta font-medium text-ink">
              <Building2 className="h-4 w-4 text-brand" />
              <span>Target Industries</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferences.industries?.length > 0 ? (
                preferences.industries.map((ind, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-canvas px-2.5 py-1 text-micro font-medium text-ink-secondary border border-line"
                  >
                    {ind}
                  </span>
                ))
              ) : (
                <span className="text-micro text-ink-muted">Open to all sectors</span>
              )}
            </div>
          </div>
        </div>

        {/* Relocation & Sponsorship notes */}
        <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center gap-6 text-meta text-ink-secondary">
          {preferences.relocation && (
            <div>
              <span className="text-ink-muted font-normal">Relocation: </span>
              <span className="font-medium text-ink capitalize">
                {preferences.relocation.replace("_", " ")}
              </span>
            </div>
          )}
          {preferences.sponsorshipNeed && (
            <div>
              <span className="text-ink-muted font-normal">Sponsorship expectation: </span>
              <span className="font-medium text-ink capitalize">
                {preferences.sponsorshipNeed.replace(/_/g, " ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
