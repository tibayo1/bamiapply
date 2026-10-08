"use client";

import { useState } from "react";
import type {
  CareerProfile,
  EvidenceLink,
  SkillCategory,
  SkillLevel,
  SkillRecord,
  VerificationStatus,
} from "@/types/profile";

interface SkillFormProps {
  initial?: Partial<SkillRecord>;
  profile: CareerProfile;
  onSubmit: (data: Partial<SkillRecord>) => void;
  formId?: string;
}

export function SkillForm({
  initial,
  profile,
  onSubmit,
  formId = "skill-form",
}: SkillFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState<SkillCategory>(
    initial?.category || "technical"
  );
  const [level, setLevel] = useState<SkillLevel | "">(initial?.level || "");
  const [evidenceLinks, setEvidenceLinks] = useState<EvidenceLink[]>(
    initial?.evidenceLinks || []
  );
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  const toggleRecordLink = (
    recordType: EvidenceLink["recordType"],
    recordId: string
  ) => {
    const exists = evidenceLinks.some(
      (l) => l.recordType === recordType && l.recordId === recordId
    );
    if (exists) {
      setEvidenceLinks(
        evidenceLinks.filter(
          (l) => !(l.recordType === recordType && l.recordId === recordId)
        )
      );
    } else {
      setEvidenceLinks([...evidenceLinks, { recordType, recordId }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      ...initial,
      name: name.trim(),
      category,
      level: level ? (level as SkillLevel) : undefined,
      evidenceLinks,
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="skill-name" className="block text-meta font-medium text-ink">
          Skill Name <span className="text-danger">*</span>
        </label>
        <input
          id="skill-name"
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Statistical analysis, Unity, EEG"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="skill-cat" className="block text-meta font-medium text-ink">
            Category <span className="text-danger">*</span>
          </label>
          <select
            id="skill-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as SkillCategory)}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          >
            <option value="technical">Technical</option>
            <option value="research">Scientific Research</option>
            <option value="engineering">Engineering & Hardware</option>
            <option value="software">Software & Programming</option>
            <option value="clinical">Clinical & Trial</option>
            <option value="professional">Professional & Communication</option>
            <option value="language">Language</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="skill-level" className="block text-meta font-medium text-ink">
            Proficiency Level (optional)
          </label>
          <select
            id="skill-level"
            value={level}
            onChange={(e) => setLevel(e.target.value as SkillLevel)}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          >
            <option value="">Not specified</option>
            <option value="familiar">Familiar</option>
            <option value="working">Working knowledge</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Linked Profile Evidence */}
      <div className="space-y-2">
        <label className="block text-meta font-medium text-ink">
          Connect to Career Evidence
        </label>
        <p className="text-micro text-ink-muted">
          Select which experiences or research projects demonstrate this skill.
        </p>

        <div className="max-h-48 overflow-y-auto rounded-lg border border-line bg-canvas p-3 space-y-2">
          {profile.experiences.map((exp) => {
            const checked = evidenceLinks.some(
              (l) => l.recordType === "experience" && l.recordId === exp.id
            );
            return (
              <label
                key={exp.id}
                className="flex items-start gap-2.5 text-meta text-ink cursor-pointer hover:text-brand"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRecordLink("experience", exp.id)}
                  className="mt-0.5 rounded border-line-strong text-brand focus:ring-brand"
                />
                <div>
                  <span className="font-medium">{exp.title}</span>
                  <span className="text-ink-muted"> · {exp.organization}</span>
                </div>
              </label>
            );
          })}

          {profile.researchProjects.map((proj) => {
            const checked = evidenceLinks.some(
              (l) => l.recordType === "research_project" && l.recordId === proj.id
            );
            return (
              <label
                key={proj.id}
                className="flex items-start gap-2.5 text-meta text-ink cursor-pointer hover:text-brand"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRecordLink("research_project", proj.id)}
                  className="mt-0.5 rounded border-line-strong text-brand focus:ring-brand"
                />
                <div>
                  <span className="font-medium">{proj.title}</span>
                  <span className="text-ink-muted"> ({proj.projectType})</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="skill-status" className="block text-meta font-medium text-ink">
          Verification Status
        </label>
        <select
          id="skill-status"
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
