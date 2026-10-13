import type {
  CareerProfile,
  CareerPreferences,
  EvidenceLink,
  PersonalProfile,
  ProfileClaim,
  ProfileCollection,
  ProfileRecord,
  ProfileSource,
  RecordMeta,
} from "@/types/profile";

const SOURCES = ["user", "cv_import", "application", "suggested"] as const;
const VERIFICATION_STATUSES = ["verified", "needs_confirmation", "draft"] as const;
const RECORD_TYPES = ["experience", "education", "research_project", "achievement", "career_story"] as const;
const COLLECTIONS: ProfileCollection[] = [
  "experiences", "education", "researchProjects", "skills", "achievements", "careerStories", "workAuthorizations",
];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string";
}

function nonempty(value: unknown): value is string {
  return text(value) && value.trim().length > 0;
}

function member<T extends string>(value: unknown, values: readonly T[]): value is T {
  return text(value) && values.some((entry) => entry === value);
}

function timestamp(value: unknown): value is string {
  return nonempty(value) && Number.isFinite(Date.parse(value));
}

function optionalStrings(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => value[field] === undefined || text(value[field]));
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function strings(value: unknown, references = false): value is string[] {
  return Array.isArray(value) && value.every(references ? nonempty : text) && (!references || unique(value));
}

function meta(value: Record<string, unknown>, now: string): RecordMeta | null {
  // Only this form-construction boundary may infer user provenance. Stored
  // records are checked for complete metadata before reaching this function.
  const source = value.source === undefined ? "user" : value.source;
  if (!member(source, SOURCES)) return null;
  const verificationStatus = value.verificationStatus === undefined
    ? source === "user" ? "verified" : source === "suggested" ? "draft" : "needs_confirmation"
    : value.verificationStatus;
  const createdAt = value.createdAt === undefined ? now : value.createdAt;
  const updatedAt = value.updatedAt === undefined ? now : value.updatedAt;
  if (!member(verificationStatus, VERIFICATION_STATUSES) || !timestamp(createdAt) || !timestamp(updatedAt)) return null;
  return { source, verificationStatus, createdAt, updatedAt };
}

function completeMeta(value: unknown): value is Record<string, unknown> & RecordMeta {
  return object(value) && member(value.source, SOURCES) && member(value.verificationStatus, VERIFICATION_STATUSES)
    && timestamp(value.createdAt) && timestamp(value.updatedAt);
}

function claim(value: unknown, source: ProfileSource, recordId: string): ProfileClaim | null {
  if (!object(value) || !nonempty(value.id) || !nonempty(value.text)
    || (value.sourceRecordId !== undefined && !nonempty(value.sourceRecordId))
    || (value.derivedFromClaimId !== undefined && !nonempty(value.derivedFromClaimId))) return null;
  const claimSource = value.source === undefined ? source : value.source;
  if (!member(claimSource, SOURCES)) return null;
  // Missing claim verification never becomes verified, even inside a verified
  // parent. Confirmation is a separate, explicit action on the statement.
  const verificationStatus = value.verificationStatus === undefined
    ? claimSource === "suggested" ? "draft" : "needs_confirmation"
    : value.verificationStatus;
  if (!member(verificationStatus, VERIFICATION_STATUSES)) return null;
  return {
    id: value.id,
    text: value.text,
    source: claimSource,
    verificationStatus,
    sourceRecordId: value.sourceRecordId ?? recordId,
    ...(value.derivedFromClaimId === undefined ? {} : { derivedFromClaimId: value.derivedFromClaimId }),
  };
}

function claims(value: unknown, source: ProfileSource, recordId: string): ProfileClaim[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const result: ProfileClaim[] = [];
  for (const item of value) {
    const normalized = claim(item, source, recordId);
    if (!normalized) return null;
    result.push(normalized);
  }
  return unique(result.map((item) => item.id)) ? result : null;
}

function evidenceLink(value: unknown): value is EvidenceLink {
  return object(value) && member(value.recordType, RECORD_TYPES) && nonempty(value.recordId)
    && (value.claimId === undefined || nonempty(value.claimId));
}

function links(value: unknown): EvidenceLink[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(evidenceLink)) return null;
  const keys = value.map((link) => JSON.stringify([link.recordType, link.recordId, link.claimId ?? null]));
  return unique(keys) ? value : null;
}

function array(value: unknown, references = false): string[] | null {
  if (value === undefined) return [];
  return strings(value, references) ? value : null;
}

/**
 * Complete a form record and validate it at the domain boundary. Missing arrays
 * become empty arrays; no candidate facts, claims, metrics or IDs are invented.
 * Missing provenance defaults to user only for this explicit form-entry API.
 */
export function normalizeProfileRecord<C extends ProfileCollection>(
  collection: C,
  input: unknown,
  now = new Date().toISOString()
): CareerProfile[C][number] | null {
  if (!object(input) || !nonempty(input.id)) return null;
  const metadata = meta(input, now);
  if (!metadata) return null;
  const base = { ...input, ...metadata, id: input.id };
  let normalized: ProfileRecord;

  switch (collection) {
    case "experiences": {
      if (!nonempty(input.title) || !nonempty(input.organization)
        || !optionalStrings(input, ["location", "startDate", "endDate", "employmentType", "summary"])
        || (input.isCurrent !== undefined && typeof input.isCurrent !== "boolean")) return null;
      const responsibilities = claims(input.responsibilities, metadata.source, input.id);
      const achievementIds = array(input.achievementIds, true);
      const skillIds = array(input.skillIds, true);
      if (!responsibilities || !achievementIds || !skillIds) return null;
      normalized = { ...base, title: input.title, organization: input.organization, responsibilities, achievementIds, skillIds };
      break;
    }
    case "education": {
      if (!nonempty(input.institution) || !nonempty(input.degree) || !nonempty(input.fieldOfStudy)
        || !optionalStrings(input, ["startDate", "endDate", "location", "grade", "thesisTitle", "notes"])
        || (input.isCurrent !== undefined && typeof input.isCurrent !== "boolean")
        || (input.coursework !== undefined && !strings(input.coursework))) return null;
      normalized = { ...base, institution: input.institution, degree: input.degree, fieldOfStudy: input.fieldOfStudy };
      break;
    }
    case "researchProjects": {
      if (!nonempty(input.title) || !member(input.projectType, ["research", "thesis", "engineering", "software", "clinical", "other"])
        || !optionalStrings(input, ["organization", "startDate", "endDate", "summary", "objective", "role"])) return null;
      const methods = array(input.methods);
      const technologies = array(input.technologies);
      const outcomes = claims(input.outcomes, metadata.source, input.id);
      const skillIds = array(input.skillIds, true);
      if (!methods || !technologies || !outcomes || !skillIds) return null;
      if (input.links !== undefined && (!Array.isArray(input.links) || !input.links.every((link) =>
        object(link) && nonempty(link.label) && nonempty(link.url)
        && (link.kind === undefined || member(link.kind, ["publication", "dataset", "portfolio", "repository", "other"]))))) return null;
      normalized = { ...base, title: input.title, projectType: input.projectType, methods, technologies, outcomes, skillIds };
      break;
    }
    case "skills": {
      if (!nonempty(input.name) || !member(input.category, ["technical", "research", "clinical", "software", "engineering", "professional", "language", "other"])
        || (input.level !== undefined && !member(input.level, ["familiar", "working", "advanced", "expert"]))) return null;
      const evidenceLinks = links(input.evidenceLinks);
      if (!evidenceLinks) return null;
      normalized = { ...base, name: input.name, category: input.category, evidenceLinks };
      break;
    }
    case "achievements": {
      if (!nonempty(input.title) || !nonempty(input.description) || !optionalStrings(input, ["linkedRecordId", "date", "notes"])
        || (input.linkedRecordType !== undefined && !member(input.linkedRecordType, RECORD_TYPES))
        || (input.linkedRecordId !== undefined && !nonempty(input.linkedRecordId))
        || ((input.linkedRecordType === undefined) !== (input.linkedRecordId === undefined))) return null;
      if (input.metric !== undefined && (!object(input.metric) || !nonempty(input.metric.value)
        || !optionalStrings(input.metric, ["context"]))) return null;
      normalized = { ...base, title: input.title, description: input.description };
      break;
    }
    case "careerStories": {
      if (!nonempty(input.title) || !optionalStrings(input, ["context", "challenge", "outcome"])) return null;
      const actions = array(input.actions);
      const demonstrates = array(input.demonstrates);
      const usefulFor = array(input.usefulFor);
      const skillIds = array(input.skillIds, true);
      const evidenceLinks = links(input.evidenceLinks);
      if (!actions || !demonstrates || !usefulFor || !skillIds || !evidenceLinks) return null;
      normalized = { ...base, title: input.title, actions, demonstrates, usefulFor, skillIds, evidenceLinks };
      break;
    }
    case "workAuthorizations": {
      if (!nonempty(input.countryOrRegion) || !member(input.status, ["authorized", "requires_sponsorship", "unknown"])
        || !optionalStrings(input, ["authorizationType", "expiresAt"])
        || (input.expiresAt !== undefined && !timestamp(input.expiresAt))) return null;
      normalized = { ...base, countryOrRegion: input.countryOrRegion, status: input.status };
      break;
    }
    default:
      return null;
  }

  // Each branch validates its specific fields; C determines which member the
  // caller receives, keeping casts out of the reducer and UI.
  return normalized as CareerProfile[C][number];
}

function personal(input: unknown): PersonalProfile | null {
  if (!completeMeta(input) || !text(input.name) || !text(input.headline)
    || !optionalStrings(input, ["currentRole", "location", "email", "phone", "linkedin", "website"])) return null;
  return input as unknown as PersonalProfile;
}

function preferences(input: unknown): CareerPreferences | null {
  if (!object(input) || !timestamp(input.updatedAt)
    || !["targetRoles", "industries", "preferredLocations", "employmentTypes", "seniority"].every((key) => strings(input[key]))
    || !Array.isArray(input.workStyles) || !input.workStyles.every((style) => member(style, ["on_site", "hybrid", "remote"]))
    || (input.relocation !== undefined && !member(input.relocation, ["willing", "not_willing", "depends"]))
    || (input.sponsorshipNeed !== undefined && !member(input.sponsorshipNeed, ["needs_sponsorship", "no_sponsorship_needed", "depends"]))) return null;
  return input as unknown as CareerPreferences;
}

function persistedClaimsHaveMetadata(record: Record<string, unknown>, collection: ProfileCollection): boolean {
  const values = collection === "experiences" ? record.responsibilities : collection === "researchProjects" ? record.outcomes : undefined;
  if (values === undefined) return true;
  return Array.isArray(values) && values.every((value) => object(value)
    && member(value.source, SOURCES) && member(value.verificationStatus, VERIFICATION_STATUSES));
}

/**
 * Validate persisted v1 data, including uniqueness across all records and
 * claims. The supported v1 repair only fills missing required record arrays;
 * missing provenance or invalid facts cannot silently acquire verification.
 */
export function normalizeCareerProfile(input: unknown): CareerProfile | null {
  if (!object(input) || !nonempty(input.id) || !timestamp(input.updatedAt)) return null;
  const normalizedPersonal = personal(input.personal);
  const normalizedPreferences = preferences(input.preferences);
  if (!normalizedPersonal || !normalizedPreferences) return null;
  const records: Partial<Record<ProfileCollection, ProfileRecord[]>> = {};
  const recordIds = new Set<string>();
  const claimIds = new Set<string>();

  for (const collection of COLLECTIONS) {
    const values = input[collection];
    if (!Array.isArray(values)) return null;
    const normalizedRecords: ProfileRecord[] = [];
    for (const value of values) {
      if (!completeMeta(value) || !persistedClaimsHaveMetadata(value, collection)) return null;
      const record = normalizeProfileRecord(collection, value, input.updatedAt);
      if (!record || recordIds.has(record.id)) return null;
      recordIds.add(record.id);
      const recordClaims = "responsibilities" in record ? record.responsibilities : "outcomes" in record ? record.outcomes : [];
      for (const item of recordClaims) {
        if (claimIds.has(item.id)) return null;
        claimIds.add(item.id);
      }
      normalizedRecords.push(record);
    }
    records[collection] = normalizedRecords;
  }

  return {
    ...input,
    ...records,
    id: input.id,
    personal: normalizedPersonal,
    preferences: normalizedPreferences,
    updatedAt: input.updatedAt,
  } as CareerProfile;
}

/** Empty recovery state never supplies demo facts as the user's evidence. */
export function createRecoveryProfile(now = new Date().toISOString()): CareerProfile {
  const metadata: RecordMeta = { source: "user", verificationStatus: "draft", createdAt: now, updatedAt: now };
  return {
    id: "profile-recovery",
    personal: { ...metadata, name: "", headline: "" },
    experiences: [], education: [], researchProjects: [], skills: [], achievements: [], careerStories: [], workAuthorizations: [],
    preferences: { targetRoles: [], industries: [], preferredLocations: [], workStyles: [], employmentTypes: [], seniority: [], updatedAt: now },
    updatedAt: now,
  };
}
