"use client";

import { useState } from "react";
import type {
  ProfileClaim,
  ProjectType,
  ResearchProjectRecord,
  VerificationStatus,
} from "@/types/profile";
import { ListEditor } from "./ListEditor";

interface ResearchProjectFormProps {
  initial?: Partial<ResearchProjectRecord>;
  onSubmit: (data: Partial<ResearchProjectRecord>) => void;
  formId?: string;
}

export function ResearchProjectForm({
  initial,
  onSubmit,
  formId = "project-form",
}: ResearchProjectFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [projectType, setProjectType] = useState<ProjectType>(
    initial?.projectType || "research"
  );
  const [organization, setOrganization] = useState(initial?.organization || "");
  const [objective, setObjective] = useState(initial?.objective || "");
  const [methods, setMethods] = useState<string[]>(initial?.methods || []);
  const [technologies, setTechnologies] = useState<string[]>(
    initial?.technologies || []
  );
  const [outcomes, setOutcomes] = useState<string[]>(
    initial?.outcomes?.map((o) => o.text) || []
  );
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    initial?.verificationStatus || "verified"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const existingClaims = initial?.outcomes || [];
    const outcomeClaims: ProfileClaim[] = outcomes.map((text, idx) => {
      const existing = existingClaims[idx];
      return {
        id: existing?.id || `claim-proj-${Date.now()}-${idx}`,
        text,
        verificationStatus,
        source: existing?.source || "user",
        sourceRecordId: initial?.id,
      };
    });

    onSubmit({
      ...initial,
      title: title.trim(),
      projectType,
      organization: organization.trim() || undefined,
      objective: objective.trim() || undefined,
      methods,
      technologies,
      outcomes: outcomeClaims,
      verificationStatus,
      source: initial?.source || "user",
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proj-title" className="block text-meta font-medium text-ink">
            Project / Study Title <span className="text-danger">*</span>
          </label>
          <input
            id="proj-title"
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Haptic VR psychophysics research"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="proj-type" className="block text-meta font-medium text-ink">
            Project Type <span className="text-danger">*</span>
          </label>
          <select
            id="proj-type"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectType)}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          >
            <option value="research">Scientific Research Study</option>
            <option value="thesis">Thesis / Dissertation Project</option>
            <option value="engineering">Hardware / Engineering Project</option>
            <option value="software">Software / Algorithm System</option>
            <option value="clinical">Clinical Trial / Investigation</option>
            <option value="other">Other Technical Work</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="proj-org" className="block text-meta font-medium text-ink">
          Institution or Affiliated Lab
        </label>
        <input
          id="proj-org"
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="e.g. Kadir Has University"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="proj-obj" className="block text-meta font-medium text-ink">
          Problem / Objective
        </label>
        <textarea
          id="proj-obj"
          rows={2}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="What problem were you solving or researching?"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <ListEditor
        label="Methods & Experimental Protocols"
        description="Techniques, study protocols, or paradigms employed."
        placeholder="e.g. Psychophysical staircases, ANOVA modelling"
        items={methods}
        onChange={setMethods}
        addButtonLabel="Add method"
      />

      <ListEditor
        label="Technologies, Tools & Hardware"
        description="Languages, sensors, apparatus or software used."
        placeholder="e.g. Unity, Arduino, Python, LabVIEW"
        items={technologies}
        onChange={setTechnologies}
        addButtonLabel="Add technology"
      />

      <ListEditor
        label="Verified Outcomes & Deliverables"
        description="Factual statements on what was delivered or discovered."
        placeholder="e.g. Characterized perceptual stiffness discrimination thresholds"
        items={outcomes}
        onChange={setOutcomes}
        addButtonLabel="Add outcome"
      />

      <div>
        <label htmlFor="proj-status" className="block text-meta font-medium text-ink">
          Verification Status
        </label>
        <select
          id="proj-status"
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
