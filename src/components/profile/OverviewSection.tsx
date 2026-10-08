"use client";

import {
  Briefcase,
  FileUp,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getProfileSignals, getSectionStatuses } from "@/lib/profile/selectors";
import type { CareerProfile } from "@/types/profile";
import type { SectionId } from "@/lib/profile/sections";

interface OverviewSectionProps {
  profile: CareerProfile;
  onEditPersonal: () => void;
  onOpenImport: () => void;
  onSelectSection: (section: SectionId) => void;
}

export function OverviewSection({
  profile,
  onEditPersonal,
  onOpenImport,
  onSelectSection,
}: OverviewSectionProps) {
  const { personal } = profile;
  const signals = getProfileSignals(profile);
  const sectionStatuses = getSectionStatuses(profile);

  const readyCount = sectionStatuses.filter((s) => s.state === "ready").length;
  const attentionCount = sectionStatuses.filter(
    (s) => s.state === "attention" || s.state === "empty"
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Profile Header Identity Card */}
      <section
        aria-label="Profile personal information"
        className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
              <span className="font-bold text-brand mr-0.5">/</span>
              VERIFIED SOURCE OF TRUTH
            </div>

            <div>
              <h1 className="text-display font-semibold text-ink tracking-tight">
                {personal.name}
              </h1>
              <p className="mt-1 text-lead text-ink-secondary">
                {personal.headline}
              </p>
            </div>

            {/* Current Role & Location */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-meta text-ink-muted">
              {personal.currentRole && (
                <span className="flex items-center gap-1.5 text-ink">
                  <Briefcase className="h-4 w-4 text-brand shrink-0" />
                  {personal.currentRole}
                </span>
              )}
              {personal.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-ink-muted shrink-0" />
                  {personal.location}
                </span>
              )}
              {personal.website && (
                <a
                  href={
                    personal.website.startsWith("http")
                      ? personal.website
                      : `https://${personal.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-brand hover:underline"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  {personal.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {/* Contact details */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-meta text-ink-muted">
              {personal.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                  {personal.email}
                </span>
              )}
              {personal.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                  {personal.phone}
                </span>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-col items-stretch gap-2.5 shrink-0 pt-2 sm:pt-0">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onOpenImport}
            >
              <FileUp className="h-4 w-4 mr-1.5" />
              Import CV
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onEditPersonal}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5 text-ink-muted" />
              Edit details
            </Button>
          </div>
        </div>
      </section>

      {/* Top Profile Quality Signals (Meaningful metrics, no gamified % score) */}
      <section aria-label="Profile quality indicators" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
            <span>SIGNALS</span>
            <span>·</span>
            <span>EVIDENCE READINESS</span>
          </div>
          <span className="font-mono text-micro text-ink-muted">
            {readyCount} sections ready · {attentionCount} need attention
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Signal 1: Verified evidence count */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between text-meta">
              <span className="text-micro font-mono uppercase tracking-wider text-ink-muted">
                Career Evidence
              </span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-ink">
                {signals.verifiedItems}
              </span>
              <span className="text-meta text-ink-secondary">verified items</span>
            </div>
            <p className="mt-1 text-micro text-ink-muted">
              Usable by Bámi as factual application proof.
            </p>
          </div>

          {/* Signal 2: Items needing confirmation */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between text-meta">
              <span className="text-micro font-mono uppercase tracking-wider text-ink-muted">
                Needs Confirmation
              </span>
              <HelpCircle className="h-4 w-4 text-warning" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-ink">
                {signals.needsConfirmation + signals.drafts}
              </span>
              <span className="text-meta text-ink-secondary">pending review</span>
            </div>
            <p className="mt-1 text-micro text-ink-muted">
              Imported items or draft rewordings awaiting your approval.
            </p>
          </div>

          {/* Signal 3: Career stories ready */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between text-meta">
              <span className="text-micro font-mono uppercase tracking-wider text-ink-muted">
                Career Stories
              </span>
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-ink">
                {signals.storiesReady}
              </span>
              <span className="text-meta text-ink-secondary">ready</span>
            </div>
            <p className="mt-1 text-micro text-ink-muted">
              Reusable for interview prep and application Q&amp;As.
            </p>
          </div>

          {/* Signal 4: Eligibility / Work Authorization */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between text-meta">
              <span className="text-micro font-mono uppercase tracking-wider text-ink-muted">
                Eligibility Gates
              </span>
              <ShieldCheck
                className={
                  signals.eligibility.complete
                    ? "h-4 w-4 text-success"
                    : "h-4 w-4 text-warning"
                }
              />
            </div>
            <div className="mt-2">
              <span
                className={`text-body font-semibold ${
                  signals.eligibility.complete ? "text-ink" : "text-warning"
                }`}
              >
                {signals.eligibility.label}
              </span>
            </div>
            <p className="mt-1 text-micro text-ink-muted">
              Pre-screens visa and work authorization gates.
            </p>
          </div>
        </div>
      </section>

      {/* Structured Section Coverage Grid */}
      <section aria-label="Section coverage breakdown" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-semibold text-ink">
            Profile Sections Breakdown
          </h2>
          <span className="text-meta text-ink-muted">
            Click any section to inspect or add records
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectionStatuses.map((sec) => {
            const isReady = sec.state === "ready";
            const isEmpty = sec.state === "empty";
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectSection(sec.id)}
                className="focus-ring transition-ui group flex flex-col justify-between rounded-xl border border-line bg-surface p-4 text-left shadow-xs hover:border-line-strong hover:bg-surface/80"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-body font-semibold text-ink group-hover:text-brand capitalize">
                      {sec.id === "research"
                        ? "Research & Projects"
                        : sec.id === "stories"
                        ? "Career Stories"
                        : sec.id}
                    </span>
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-semibold uppercase text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready
                      </span>
                    ) : isEmpty ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase text-ink-muted">
                        Empty
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-semibold uppercase text-warning">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Attention
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-meta text-ink-secondary">
                    {sec.note}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-line/60 flex items-center justify-between font-mono text-micro text-ink-muted">
                  <span>
                    {sec.count} {sec.count === 1 ? "record" : "records"}
                  </span>
                  <span className="text-brand group-hover:underline">
                    View section →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
