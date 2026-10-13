"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FileText,
  UploadCloud,
  Check,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  GitMerge,
  Copy,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getMockCvExtractionFixture,
  type StagedCvImport,
} from "@/lib/profile/import-fixture";
import {
  detectConflicts,
  isUnambiguousImport,
  mergeExperienceRecords,
  prepareImportAdditions,
  type ConflictResolution,
} from "@/lib/profile/import";
import { useProfile } from "@/lib/profile/context";
import { profileReducer } from "@/lib/profile/reducer";

interface ImportCvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCvDialog({ open, onOpenChange }: ImportCvDialogProps) {
  const { profile, dispatch } = useProfile();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isExtracting, setIsExtracting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileName = "Ayoade_Adeyemi_CV.pdf";
  const stagedData: StagedCvImport = getMockCvExtractionFixture();

  // Selected item IDs (all selected by default)
  const [selectedExp, setSelectedExp] = useState<Record<string, boolean>>({
    "imp-exp-kadir-has": true,
    "imp-exp-intern": true,
  });
  const [selectedEdu, setSelectedEdu] = useState<Record<string, boolean>>({
    "imp-edu-phd": true,
    "imp-edu-msc": true,
  });
  const [selectedProj, setSelectedProj] = useState<Record<string, boolean>>({
    "imp-proj-sensorimotor": true,
  });
  const [selectedSkills, setSelectedSkills] = useState<Record<string, boolean>>({
    "imp-sk-matlab": true,
    "imp-sk-scipy": true,
    "imp-sk-timeseries": true,
    "imp-sk-calibration": true,
    "imp-sk-git": true,
  });
  const [selectedAch, setSelectedAch] = useState<Record<string, boolean>>({
    "imp-ach-symposium": true,
  });

  // Conflict resolutions: recordId -> "merge" | "keep_both" | "ignore"
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, ConflictResolution>
  >({
    "imp-exp-kadir-has": "merge",
    "imp-edu-phd": "ignore",
  });

  const conflicts = detectConflicts(profile, stagedData);

  const handleStartExtraction = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      setStep("review");
    }, 600);
  };

  const handleCommit = () => {
    if (!isUnambiguousImport(stagedData)) {
      setImportError("The extracted records contain conflicting references. Try extracting the CV again before adding these facts.");
      return;
    }
    setImportError(null);
    const now = new Date().toISOString();
    let nextProfile = profile;
    // 1. Process Experiences
    const expsToAdd = [];
    for (const exp of stagedData.experiences) {
      if (!selectedExp[exp.id]) continue;
      const conf = conflicts.find((c) => c.importedRecordId === exp.id);
      if (conf) {
        const resolution = conflictResolutions[exp.id] || "merge";
        if (resolution === "merge") {
          const existing = nextProfile.experiences.find(
            (e) => e.id === conf.existingRecordId
          );
          if (existing) {
            const merged = mergeExperienceRecords(existing, exp, now, nextProfile);
            if (merged === existing) continue;
            const updated = profileReducer(nextProfile, {
              type: "UPSERT_RECORD",
              collection: "experiences",
              record: merged,
            }, now);
            if (updated === nextProfile) {
              setImportError("These claims could not be safely added to the existing record. Your profile has not changed. Keep the import separately or review its facts again.");
              return;
            }
            nextProfile = updated;
          }
        } else if (resolution === "keep_both") {
          expsToAdd.push(exp);
        }
        // if "ignore", do nothing
      } else {
        expsToAdd.push(exp);
      }
    }

    // 2. Process Education
    const eduToAdd = [];
    for (const edu of stagedData.education) {
      if (!selectedEdu[edu.id]) continue;
      const conf = conflicts.find((c) => c.importedRecordId === edu.id);
      if (conf) {
        const resolution = conflictResolutions[edu.id] || "ignore";
        if (resolution === "keep_both") {
          eduToAdd.push(edu);
        }
      } else {
        eduToAdd.push(edu);
      }
    }

    // 3. Process Projects
    const projToAdd = stagedData.researchProjects.filter(
      (p) => selectedProj[p.id]
    );

    // 4. Process Skills
    const skillsToAdd = stagedData.skills.filter((s) => selectedSkills[s.id]);

    // 5. Process Achievements
    const achToAdd = stagedData.achievements.filter((a) => selectedAch[a.id]);

    const additions = {
        experiences: expsToAdd.length > 0 ? expsToAdd : undefined,
        education: eduToAdd.length > 0 ? eduToAdd : undefined,
        researchProjects: projToAdd.length > 0 ? projToAdd : undefined,
        skills: skillsToAdd.length > 0 ? skillsToAdd : undefined,
        achievements: achToAdd.length > 0 ? achToAdd : undefined,
    };
    const prepared = prepareImportAdditions(nextProfile, additions);
    const updated = profileReducer(nextProfile, { type: "APPLY_IMPORT", additions }, now);
    if (Object.values(prepared).some((records) => records?.length) && updated === nextProfile) {
      setImportError("These extracted facts could not be safely saved. Your profile has not changed. Review the selected records and try again.");
      return;
    }
    // Commit the complete, validated result together so a rejected record cannot
    // leave an import partially applied or close the dialog without explanation.
    if (updated !== profile) dispatch({ type: "REPLACE_PROFILE", profile: updated });

    onOpenChange(false);
    setStep("upload");
  };

  const totalSelected =
    Object.values(selectedExp).filter(Boolean).length +
    Object.values(selectedEdu).filter(Boolean).length +
    Object.values(selectedProj).filter(Boolean).length +
    Object.values(selectedSkills).filter(Boolean).length +
    Object.values(selectedAch).filter(Boolean).length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-surface shadow-2xl border border-line focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4.5 shrink-0 bg-surface">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
                <span className="font-bold text-brand mr-0.5">/</span>
                PARSING PIPELINE
              </div>
              <Dialog.Title className="mt-0.5 text-heading font-semibold text-ink">
                Import Career Profile from CV
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="focus-ring transition-ui rounded-md p-1.5 text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === "upload" ? (
              <div className="space-y-6">
                <div className="rounded-xl border-2 border-dashed border-line-strong bg-inset/30 p-8 text-center transition-colors hover:border-brand">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-subtle text-brand">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-body font-semibold text-ink">
                    Preview a sample CV import
                  </h3>
                  <p className="mt-1 text-meta text-ink-muted">
                    This demo uses sample records. File extraction is not connected yet.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 border border-line shadow-xs">
                    <FileText className="h-4 w-4 text-brand" />
                    <span className="font-mono text-meta font-medium text-ink">
                      {fileName}
                    </span>
                    <span className="text-micro text-ink-muted">(142 KB)</span>
                  </div>
                </div>

                <div className="rounded-xl bg-canvas p-4 border border-line text-meta text-ink-secondary space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <Sparkles className="h-4 w-4 text-brand" />
                    How Bámi handles CV imports:
                  </div>
                  <p className="text-meta text-ink-muted leading-relaxed">
                    Imported facts stay unconfirmed, including claims added to an existing record.
                    Review their wording here, then confirm accurate facts in your Career Profile before they can support an application.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-body font-semibold text-ink">
                      Review Extracted Items ({totalSelected} selected)
                    </h3>
                    <p className="text-meta text-ink-muted">
                      Read the extracted facts and choose what to add. Selecting or merging an item does not verify it.
                    </p>
                  </div>
                  <span className="rounded-full bg-warning-subtle px-2.5 py-1 font-mono text-micro font-medium text-warning">
                    Source: cv_import
                  </span>
                </div>
                {importError && (
                  <p role="alert" className="rounded-lg border border-warning/40 bg-warning-subtle p-3 text-meta text-warning">
                    {importError}
                  </p>
                )}

                {/* Conflict Banner if duplicate detected */}
                {conflicts.length > 0 && (
                  <div className="rounded-xl border border-warning/40 bg-warning-subtle/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-warning font-semibold text-meta">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{conflicts.length} Overlapping Record(s) Detected</span>
                    </div>
                    {conflicts.map((conf) => (
                      <div
                        key={conf.id}
                        className="rounded-lg bg-surface p-3 border border-line/80 space-y-2"
                      >
                        <div className="text-meta text-ink">
                          <strong>{conf.organization}:</strong> Extracted{" "}
                          <span className="font-mono text-brand font-medium">
                            &quot;{conf.importedTitle}&quot;
                          </span>{" "}
                          overlaps with existing{" "}
                          <span className="font-mono text-ink font-medium">
                            &quot;{conf.existingTitle}&quot;
                          </span>
                          .
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {conf.category === "experience" && <label className="flex items-center gap-1.5 text-micro font-medium text-ink cursor-pointer bg-canvas px-2.5 py-1 rounded-md border border-line">
                            <input
                              type="radio"
                              name={`res-${conf.id}`}
                              checked={
                                (conflictResolutions[conf.importedRecordId] ?? "merge") ===
                                "merge"
                              }
                              onChange={() =>
                                setConflictResolutions((prev) => ({
                                  ...prev,
                                  [conf.importedRecordId]: "merge",
                                }))
                              }
                              className="text-brand"
                            />
                            <GitMerge className="h-3.5 w-3.5 text-brand" />
                            Add unconfirmed claims to existing record
                          </label>}
                          <label className="flex items-center gap-1.5 text-micro font-medium text-ink cursor-pointer bg-canvas px-2.5 py-1 rounded-md border border-line">
                            <input
                              type="radio"
                              name={`res-${conf.id}`}
                              checked={
                                (conflictResolutions[conf.importedRecordId] ?? (conf.category === "experience" ? "merge" : "ignore")) ===
                                "keep_both"
                              }
                              onChange={() =>
                                setConflictResolutions((prev) => ({
                                  ...prev,
                                  [conf.importedRecordId]: "keep_both",
                                }))
                              }
                              className="text-brand"
                            />
                            <Copy className="h-3.5 w-3.5 text-ink-muted" />
                            Keep both as separate records
                          </label>
                          <label className="flex items-center gap-1.5 text-micro font-medium text-ink cursor-pointer bg-canvas px-2.5 py-1 rounded-md border border-line">
                            <input
                              type="radio"
                              name={`res-${conf.id}`}
                              checked={
                                (conflictResolutions[conf.importedRecordId] ?? (conf.category === "experience" ? "merge" : "ignore")) ===
                                "ignore"
                              }
                              onChange={() =>
                                setConflictResolutions((prev) => ({
                                  ...prev,
                                  [conf.importedRecordId]: "ignore",
                                }))
                              }
                              className="text-brand"
                            />
                            <Ban className="h-3.5 w-3.5 text-danger" />
                            Skip / Ignore
                          </label>
                        </div>
                        {conf.category === "education" && (
                          <p className="text-micro text-ink-muted">
                            Education facts are kept together as a record. Keep the import separately for review, or skip it to preserve your existing record.
                          </p>
                        )}
                        {conf.category === "experience" && (
                          <p className="text-micro text-ink-muted">
                            Merging adds unconfirmed claims only. Existing details and skill links are preserved; imported skills can be reviewed separately.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Staged sections breakdown */}
                <div className="space-y-4">
                  {/* Experience */}
                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                      Experience Records ({stagedData.experiences.length})
                    </span>
                    <div className="mt-2 divide-y divide-line">
                      {stagedData.experiences.map((exp) => (
                        <label
                          key={exp.id}
                          className="flex items-start gap-3 py-2.5 cursor-pointer first:pt-1 last:pb-0"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedExp[exp.id]}
                            onChange={(e) =>
                              setSelectedExp((prev) => ({
                                ...prev,
                                [exp.id]: e.target.checked,
                              }))
                            }
                            className="mt-1 rounded border-line-strong text-brand focus:ring-brand"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-meta font-medium text-ink">
                              {exp.title} · {exp.organization}
                            </div>
                            <div className="text-micro text-ink-muted">
                              {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate} · Unconfirmed import
                            </div>
                            {exp.summary && <p className="mt-2 text-meta text-ink-secondary">{exp.summary}</p>}
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-meta text-ink-secondary">
                              {exp.responsibilities.map((claim) => <li key={claim.id}>{claim.text}</li>)}
                            </ul>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                      Extracted Skills ({stagedData.skills.length})
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stagedData.skills.map((skill) => (
                        <label
                          key={skill.id}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-meta cursor-pointer transition-ui ${
                            selectedSkills[skill.id]
                              ? "border-brand bg-brand-subtle/50 text-brand font-medium"
                              : "border-line bg-canvas text-ink-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedSkills[skill.id]}
                            onChange={(e) =>
                              setSelectedSkills((prev) => ({
                                ...prev,
                                [skill.id]: e.target.checked,
                              }))
                            }
                            className="hidden"
                          />
                          {selectedSkills[skill.id] && (
                            <Check className="h-3 w-3 text-brand" />
                          )}
                          <span>{skill.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Projects & Education */}
                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                      Projects &amp; Education
                    </span>
                    <div className="mt-2 divide-y divide-line">
                      {stagedData.researchProjects.map((proj) => (
                        <label
                          key={proj.id}
                          className="flex items-start gap-3 py-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedProj[proj.id]}
                            onChange={(e) =>
                              setSelectedProj((prev) => ({
                                ...prev,
                                [proj.id]: e.target.checked,
                              }))
                            }
                            className="mt-1 rounded border-line-strong text-brand"
                          />
                          <div className="text-meta text-ink">
                            <span className="font-medium">{proj.title}</span> ({proj.projectType})
                            {proj.objective && <p className="mt-1 text-ink-secondary">{proj.objective}</p>}
                            {proj.summary && <p className="mt-1 text-ink-secondary">{proj.summary}</p>}
                            {proj.methods.length > 0 && <p className="mt-1 text-ink-muted">Methods: {proj.methods.join(", ")}</p>}
                            {proj.technologies.length > 0 && <p className="mt-1 text-ink-muted">Tools: {proj.technologies.join(", ")}</p>}
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-ink-secondary">
                              {proj.outcomes.map((claim) => <li key={claim.id}>{claim.text}</li>)}
                            </ul>
                          </div>
                        </label>
                      ))}
                      {stagedData.education.map((edu) => (
                        <label
                          key={edu.id}
                          className="flex items-start gap-3 py-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedEdu[edu.id]}
                            onChange={(e) =>
                              setSelectedEdu((prev) => ({
                                ...prev,
                                [edu.id]: e.target.checked,
                              }))
                            }
                            className="mt-1 rounded border-line-strong text-brand"
                          />
                          <div className="text-meta text-ink">
                            <span className="font-medium">
                              {edu.degree}, {edu.fieldOfStudy}
                            </span>{" "}
                            · {edu.institution}
                            {edu.grade && <p className="mt-1 text-ink-secondary">Grade: {edu.grade}</p>}
                            {edu.thesisTitle && <p className="mt-1 text-ink-secondary">Thesis: {edu.thesisTitle}</p>}
                            {edu.coursework && edu.coursework.length > 0 && <p className="mt-1 text-ink-secondary">Coursework: {edu.coursework.join(", ")}</p>}
                            {edu.notes && <p className="mt-1 text-ink-secondary">{edu.notes}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  {stagedData.achievements.length > 0 && (
                    <div className="rounded-xl border border-line bg-surface p-4">
                      <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                        Extracted Achievements ({stagedData.achievements.length})
                      </span>
                      <div className="mt-2 divide-y divide-line">
                        {stagedData.achievements.map((ach) => (
                          <label
                            key={ach.id}
                            className="flex items-start gap-3 py-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedAch[ach.id]}
                              onChange={(e) =>
                                setSelectedAch((prev) => ({
                                  ...prev,
                                  [ach.id]: e.target.checked,
                                }))
                              }
                              className="mt-1 rounded border-line-strong text-brand"
                            />
                            <div className="text-meta text-ink">
                              <span className="font-medium">{ach.title}</span>
                              {ach.date && (
                                <span className="text-ink-muted"> · {ach.date}</span>
                              )}
                              <p className="mt-1 text-ink-secondary">{ach.description}</p>
                              {ach.metric && <p className="mt-1 text-ink-secondary">{ach.metric.value}{ach.metric.context ? ` · ${ach.metric.context}` : ""}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line px-6 py-4 shrink-0 bg-surface">
            {step === "upload" ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleStartExtraction}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    "Extracting career records..."
                  ) : (
                    <>
                      Simulate CV extraction
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("upload")}
                >
                  Back to upload
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCommit}
                  disabled={totalSelected === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Add selected items for confirmation
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
