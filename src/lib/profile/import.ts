import type {
  CareerProfile,
  EvidenceLink,
  ExperienceRecord,
  ProfileClaim,
  ProfileRecord,
  VerificationStatus,
} from "@/types/profile";
import type { StagedCvImport } from "./import-fixture";

export type ImportAdditions = Partial<StagedCvImport>;
const importCollections = ["experiences", "education", "researchProjects", "skills", "achievements"] as const;

const normalize = (value: string = "") =>
  value.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");

const normalizeField = (value: string) => normalize(value.replace(/&/g, "and"));

function degreeKey(value: string): string {
  const degree = normalize(value).replace(/[.]/g, "");
  if (/^(phd|doctor of philosophy)( candidate)?$/.test(degree)) return "phd";
  if (/^(msc|master of science)$/.test(degree)) return "msc";
  if (/^(bsc|bachelor of science)$/.test(degree)) return "bsc";
  return degree;
}

function compatibleDates(a?: string, b?: string): boolean {
  return !a || !b || normalize(a) === normalize(b);
}

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

  // A different role or employment period at the same employer is not a duplicate.
  for (const imp of staged.experiences) {
    const existing = profile.experiences.find(
      (e) =>
        normalize(e.organization) === normalize(imp.organization) &&
        normalize(e.title) === normalize(imp.title) &&
        compatibleDates(e.startDate, imp.startDate) &&
        compatibleDates(e.endDate, imp.endDate)
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
        normalize(e.institution) === normalize(imp.institution) &&
        degreeKey(e.degree) === degreeKey(imp.degree) &&
        normalizeField(e.fieldOfStudy) === normalizeField(imp.fieldOfStudy) &&
        compatibleDates(e.startDate, imp.startDate) &&
        compatibleDates(e.endDate, imp.endDate)
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
  now: string = new Date().toISOString(),
  profile?: CareerProfile
): ExperienceRecord {
  const existingTexts = new Map(existing.responsibilities.map((r) => [normalize(r.text), r.id]));
  const usedIds = new Set([
    ...existing.responsibilities.map((r) => r.id),
    ...(profile ? profileRecords(profile).flatMap((record) => [record.id, ...claimsOf(record).map((c) => c.id)]) : []),
  ]);
  const claimIds = new Map<string, string>();
  const newClaims: ProfileClaim[] = [];
  for (const claim of imported.responsibilities) {
    const retainedId = existingTexts.get(normalize(claim.text));
    if (retainedId) {
      claimIds.set(claim.id, retainedId);
      continue;
    }
    const id = reserveId(claim.id, usedIds);
    existingTexts.set(normalize(claim.text), id);
    claimIds.set(claim.id, id);
    newClaims.push({
      ...claim,
      id,
      sourceRecordId:
        !claim.sourceRecordId || claim.sourceRecordId === imported.id
          ? existing.id
          : claim.sourceRecordId,
      verificationStatus: claim.verificationStatus === "draft" ? "draft" : "needs_confirmation",
    });
  }

  if (newClaims.length === 0) return existing;

  return {
    ...existing,
    responsibilities: [
      ...existing.responsibilities,
      ...newClaims.map((claim) => ({
        ...claim,
        ...(claim.derivedFromClaimId
          ? { derivedFromClaimId: claimIds.get(claim.derivedFromClaimId) ?? claim.derivedFromClaimId }
          : {}),
      })),
    ],
    updatedAt: now,
  };
}

function reserveId(id: string, used: Set<string>): string {
  let candidate = id;
  let suffix = 1;
  while (used.has(candidate)) candidate = `${id}-import-${suffix++}`;
  used.add(candidate);
  return candidate;
}

function claimsOf(record: ProfileRecord): ProfileClaim[] {
  if ("responsibilities" in record) return record.responsibilities;
  if ("outcomes" in record) return record.outcomes;
  return [];
}

function profileRecords(profile: CareerProfile): ProfileRecord[] {
  return [
    ...profile.experiences, ...profile.education, ...profile.researchProjects,
    ...profile.skills, ...profile.achievements, ...profile.careerStories,
    ...profile.workAuthorizations,
  ];
}

/** Compare facts rather than extraction ids, timestamps, or verification metadata. */
function contentKey(record: StagedCvImport[keyof StagedCvImport][number]): string {
  const facts: Record<string, unknown> = { ...record };
  for (const key of ["id", "source", "verificationStatus", "createdAt", "updatedAt"]) {
    delete facts[key];
  }
  // Links are remapped separately; record/claim identities are not CV facts.
  for (const key of ["skillIds", "achievementIds", "evidenceLinks", "linkedRecordId"]) {
    delete facts[key];
  }
  for (const key of ["responsibilities", "outcomes"]) {
    if (key in facts) {
      facts[key] = [...new Set((facts[key] as ProfileClaim[]).map((c) => normalize(c.text)))].sort();
    }
  }
  const canonicalize = (value: unknown): unknown => {
    if (typeof value === "string") return normalize(value);
    if (Array.isArray(value)) return value.map(canonicalize).sort();
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
          .filter(([, entry]) => entry !== undefined)
          .map(([key, entry]) => [key, canonicalize(entry)])
      );
    }
    return value;
  };
  return JSON.stringify(canonicalize(facts));
}

export function isUnambiguousImport(additions: ImportAdditions): boolean {
  // Two unrelated facts with the same extraction id make references ambiguous.
  // Reject the batch rather than silently point its evidence at the wrong fact.
  const incomingIds = new Map<string, string>();
  for (const collection of importCollections) {
    for (const record of additions[collection] ?? []) {
      const recordIdentity = `record:${collection}:${contentKey(record)}`;
      const entries: Array<[string, string]> = [
        [record.id, recordIdentity],
        ...claimsOf(record).map((claim): [string, string] =>
          [claim.id, `claim:${recordIdentity}:${normalize(claim.text)}`]
        ),
      ];
      for (const [id, identity] of entries) {
        if (incomingIds.has(id) && incomingIds.get(id) !== identity) return false;
        incomingIds.set(id, identity);
      }
    }
  }
  return true;
}

/**
 * Prepare additions without replacing any existing facts or verification.
 * Repeated extractions reuse matching record/claim ids; unrelated id collisions
 * get new ids and all references within the import follow those new ids.
 */
export function prepareImportAdditions(
  profile: CareerProfile,
  additions: ImportAdditions
): ImportAdditions {
  if (!isUnambiguousImport(additions)) return {};
  const allRecords = profileRecords(profile);
  const usedIds = new Set(allRecords.flatMap((record) => [record.id, ...claimsOf(record).map((c) => c.id)]));
  const recordIds = new Map<string, string>();
  const claimIds = new Map<string, string>();
  const prepared: StagedCvImport = { experiences: [], education: [], researchProjects: [], skills: [], achievements: [] };

  const unconfirmed = <T extends { verificationStatus: VerificationStatus }>(record: T): T => ({
    ...record,
    verificationStatus: record.verificationStatus === "draft" ? "draft" : "needs_confirmation",
  });
  for (const collection of importCollections) {
    const existing = profile[collection];
    const output = prepared[collection] as Array<StagedCvImport[keyof StagedCvImport][number]>;
    for (const record of additions[collection] ?? []) {
      const match = [...existing, ...output].find((candidate) =>
        collection === "skills" && "name" in candidate && "name" in record
          ? normalize(candidate.name) === normalize(record.name) && candidate.category === record.category
          : contentKey(candidate) === contentKey(record)
      );
      if (match) {
        recordIds.set(record.id, match.id);
        for (const claim of claimsOf(record)) {
          const retained = claimsOf(match).find((c) => normalize(c.text) === normalize(claim.text));
          if (retained) claimIds.set(claim.id, retained.id);
        }
        continue;
      }

      const id = reserveId(record.id, usedIds);
      recordIds.set(record.id, id);
      const texts = new Map<string, string>();
      const claims: ProfileClaim[] = [];
      for (const claim of claimsOf(record)) {
        const retainedId = texts.get(normalize(claim.text));
        if (retainedId) {
          claimIds.set(claim.id, retainedId);
          continue;
        }
        const claimId = reserveId(claim.id, usedIds);
        claimIds.set(claim.id, claimId);
        texts.set(normalize(claim.text), claimId);
        claims.push(unconfirmed({ ...claim, id: claimId }));
      }
      output.push(unconfirmed({
        ...record,
        id,
        ...("responsibilities" in record ? { responsibilities: claims } : {}),
        ...("outcomes" in record ? { outcomes: claims } : {}),
      }));
    }
  }

  const recordsByType = {
    experience: [...profile.experiences, ...prepared.experiences],
    education: [...profile.education, ...prepared.education],
    research_project: [...profile.researchProjects, ...prepared.researchProjects],
    achievement: [...profile.achievements, ...prepared.achievements],
    career_story: profile.careerStories,
  };
  const skillIds = new Set([...profile.skills, ...prepared.skills].map((r) => r.id));
  const achievementIds = new Set(recordsByType.achievement.map((r) => r.id));
  const mapIds = (ids: string[], allowed: Set<string>) =>
    [...new Set(ids.map((id) => recordIds.get(id) ?? id))].filter((id) => allowed.has(id));
  const mapClaims = (claims: ProfileClaim[], parentId: string): ProfileClaim[] =>
    claims.map((claim) => ({
      ...claim,
      sourceRecordId: claim.sourceRecordId
        ? recordIds.get(claim.sourceRecordId) ?? claim.sourceRecordId
        : parentId,
      ...(claim.derivedFromClaimId
        ? { derivedFromClaimId: claimIds.get(claim.derivedFromClaimId) ?? claim.derivedFromClaimId }
        : {}),
    }));
  const mapLinks = (links: EvidenceLink[]): EvidenceLink[] => {
    const result: EvidenceLink[] = [];
    for (const link of links) {
      const mapped = {
        ...link,
        recordId: recordIds.get(link.recordId) ?? link.recordId,
        ...(link.claimId ? { claimId: claimIds.get(link.claimId) ?? link.claimId } : {}),
      };
      const target = recordsByType[mapped.recordType].find((r) => r.id === mapped.recordId);
      if (!target || (mapped.claimId && !claimsOf(target).some((c) => c.id === mapped.claimId))) continue;
      if (!result.some((l) => l.recordType === mapped.recordType && l.recordId === mapped.recordId && l.claimId === mapped.claimId)) {
        result.push(mapped);
      }
    }
    return result;
  };

  prepared.experiences = prepared.experiences.map((record) => ({
    ...record, responsibilities: mapClaims(record.responsibilities, record.id),
    skillIds: mapIds(record.skillIds, skillIds), achievementIds: mapIds(record.achievementIds, achievementIds),
  }));
  prepared.researchProjects = prepared.researchProjects.map((record) => ({
    ...record, outcomes: mapClaims(record.outcomes, record.id), skillIds: mapIds(record.skillIds, skillIds),
  }));
  prepared.skills = prepared.skills.map((record) => ({ ...record, evidenceLinks: mapLinks(record.evidenceLinks) }));
  prepared.achievements = prepared.achievements.map((record) => {
    if (!record.linkedRecordId || !record.linkedRecordType) return record;
    const linkedRecordId = recordIds.get(record.linkedRecordId) ?? record.linkedRecordId;
    if (!recordsByType[record.linkedRecordType].some((r) => r.id === linkedRecordId)) {
      const unlinked = { ...record };
      delete unlinked.linkedRecordId;
      delete unlinked.linkedRecordType;
      return unlinked;
    }
    return { ...record, linkedRecordId };
  });

  return Object.fromEntries(importCollections.filter((key) => prepared[key].length > 0).map((key) => [key, prepared[key]]));
}
