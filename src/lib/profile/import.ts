import type {
  CareerProfile,
  ExperienceRecord,
  ProfileClaim,
} from "@/types/profile";
import type { StagedCvImport } from "./import-fixture";

export interface ImportConflict {
  id: string;
  category: "experience" | "education";
  existingRecordId: string;
  importedRecordId: string;
  existingTitle: string;
  importedTitle: string;
  organization: string;
  message: string;
}

export type ConflictResolution = "merge" | "keep_both" | "ignore";

export function detectConflicts(
  profile: CareerProfile,
  staged: StagedCvImport
): ImportConflict[] {
  const conflicts: ImportConflict[] = [];

  // Check experience duplicates: same or very similar organization
  for (const imp of staged.experiences) {
    const existing = profile.experiences.find(
      (e) =>
        e.organization.toLowerCase().trim() === imp.organization.toLowerCase().trim()
    );
    if (existing) {
      conflicts.push({
        id: `conflict-exp-${imp.id}`,
        category: "experience",
        existingRecordId: existing.id,
        importedRecordId: imp.id,
        existingTitle: existing.title,
        importedTitle: imp.title,
        organization: existing.organization,
        message: `Both records reference ${existing.organization} (${existing.title} vs ${imp.title}).`,
      });
    }
  }

  // Check education duplicates
  for (const imp of staged.education) {
    const existing = profile.education.find(
      (e) =>
        e.institution.toLowerCase().trim() === imp.institution.toLowerCase().trim() &&
        (e.degree.toLowerCase().includes(imp.degree.toLowerCase()) ||
          imp.degree.toLowerCase().includes(e.degree.toLowerCase()))
    );
    if (existing) {
      conflicts.push({
        id: `conflict-edu-${imp.id}`,
        category: "education",
        existingRecordId: existing.id,
        importedRecordId: imp.id,
        existingTitle: `${existing.degree}, ${existing.fieldOfStudy}`,
        importedTitle: `${imp.degree}, ${imp.fieldOfStudy}`,
        organization: existing.institution,
        message: `Both records reference ${existing.institution}.`,
      });
    }
  }

  return conflicts;
}

export function mergeExperienceRecords(
  existing: ExperienceRecord,
  imported: ExperienceRecord,
  now: string = new Date().toISOString()
): ExperienceRecord {
  // Appends new responsibilities without overwriting existing ones
  const existingTexts = new Set(
    existing.responsibilities.map((r) => r.text.toLowerCase().trim())
  );
  const newClaims: ProfileClaim[] = imported.responsibilities
    .filter((r) => !existingTexts.has(r.text.toLowerCase().trim()))
    .map((r) => ({
      ...r,
      sourceRecordId: existing.id,
      verificationStatus: "verified", // User confirmed via merge
    }));

  const allSkills = Array.from(new Set([...existing.skillIds, ...imported.skillIds]));

  return {
    ...existing,
    summary: existing.summary || imported.summary,
    location: existing.location || imported.location,
    responsibilities: [...existing.responsibilities, ...newClaims],
    skillIds: allSkills,
    updatedAt: now,
  };
}
