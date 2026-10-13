import type {
  AchievementRecord,
  CareerProfile,
  CareerStory,
  EducationRecord,
  EvidenceLink,
  EvidenceRecordType,
  ExperienceRecord,
  ProfileClaim,
  ResearchProjectRecord,
  VerificationStatus,
} from "@/types/profile";
import { SECTION_BY_RECORD_TYPE, profileHref } from "./sections";

/**
 * Evidence resolution.
 *
 * The single place that decides whether profile information may be used as
 * evidence: ONLY when the record and (if specified) the claim are both
 * `verified`. needs_confirmation and draft items resolve — so they can be
 * shown to the user with an honest label — but are never `usable`.
 */

export type EvidenceRecord =
  | ExperienceRecord
  | EducationRecord
  | ResearchProjectRecord
  | AchievementRecord
  | CareerStory;

export interface ResolvedEvidence {
  link: EvidenceLink;
  recordType: EvidenceRecordType;
  recordId: string;
  recordTitle: string;
  organization?: string;
  claim?: ProfileClaim;
  /** Short text derived from the underlying record/claim. Never stored separately. */
  excerpt: string;
  /** Weakest status of the record and the claim. */
  status: VerificationStatus;
  /** True only when status is "verified". */
  usable: boolean;
  /** Deep link back to the original record in Career Profile. */
  href: string;
}

const RANK: Record<VerificationStatus, number> = {
  verified: 0,
  needs_confirmation: 1,
  draft: 2,
};

/** Weakest of the given statuses. */
export function combineStatus(...statuses: VerificationStatus[]): VerificationStatus {
  return statuses.reduce<VerificationStatus>(
    (worst, s) => (RANK[s] > RANK[worst] ? s : worst),
    "verified"
  );
}

export function isUsableEvidence(status: VerificationStatus): boolean {
  return status === "verified";
}

export function linkKey(link: EvidenceLink): string {
  return JSON.stringify([link.recordType, link.recordId, link.claimId ?? null]);
}

export function evidenceHref(link: EvidenceLink): string {
  return profileHref(SECTION_BY_RECORD_TYPE[link.recordType], link.recordId);
}

export function findEvidenceRecord(
  profile: CareerProfile,
  recordType: EvidenceRecordType,
  recordId: string
): EvidenceRecord | undefined {
  switch (recordType) {
    case "experience":
      return profile.experiences.find((r) => r.id === recordId);
    case "education":
      return profile.education.find((r) => r.id === recordId);
    case "research_project":
      return profile.researchProjects.find((r) => r.id === recordId);
    case "achievement":
      return profile.achievements.find((r) => r.id === recordId);
    case "career_story":
      return profile.careerStories.find((r) => r.id === recordId);
  }
}

/** Claims live inside experiences (responsibilities) and projects (outcomes). */
export function getRecordClaims(
  recordType: EvidenceRecordType,
  record: EvidenceRecord
): ProfileClaim[] {
  if (recordType === "experience") return (record as ExperienceRecord).responsibilities;
  if (recordType === "research_project") return (record as ResearchProjectRecord).outcomes;
  return [];
}

function describe(
  recordType: EvidenceRecordType,
  record: EvidenceRecord
): { title: string; organization?: string; excerpt: string } {
  switch (recordType) {
    case "experience": {
      const r = record as ExperienceRecord;
      const firstVerified = r.responsibilities.find((c) => c.verificationStatus === "verified");
      return {
        title: r.title,
        organization: r.organization,
        excerpt: r.summary || firstVerified?.text || r.title,
      };
    }
    case "education": {
      const r = record as EducationRecord;
      return {
        title: `${r.degree}, ${r.fieldOfStudy}`,
        organization: r.institution,
        excerpt: `${r.degree} in ${r.fieldOfStudy}`,
      };
    }
    case "research_project": {
      const r = record as ResearchProjectRecord;
      return {
        title: r.title,
        organization: r.organization,
        excerpt: r.objective || r.summary || r.title,
      };
    }
    case "achievement": {
      const r = record as AchievementRecord;
      return { title: r.title, excerpt: r.description || r.title };
    }
    case "career_story": {
      const r = record as CareerStory;
      return { title: r.title, excerpt: r.challenge || r.context || r.title };
    }
  }
}

/**
 * Resolve an EvidenceLink to the underlying profile record (and claim).
 * Returns null for a dangling link (record or claim no longer exists).
 */
export function resolveEvidenceLink(
  profile: CareerProfile,
  link: EvidenceLink
): ResolvedEvidence | null {
  const record = findEvidenceRecord(profile, link.recordType, link.recordId);
  if (!record) return null;

  let claim: ProfileClaim | undefined;
  if (link.claimId) {
    claim = getRecordClaims(link.recordType, record).find((c) => c.id === link.claimId);
    if (!claim) return null;
  }

  const info = describe(link.recordType, record);
  const status = claim
    ? combineStatus(record.verificationStatus, claim.verificationStatus)
    : record.verificationStatus;

  return {
    link,
    recordType: link.recordType,
    recordId: link.recordId,
    recordTitle: info.title,
    organization: info.organization,
    claim,
    excerpt: claim ? claim.text : info.excerpt,
    status,
    usable: isUsableEvidence(status),
    href: evidenceHref(link),
  };
}
