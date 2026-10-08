/**
 * Career Profile domain model.
 *
 * The profile is the verified source of truth behind every Bámi feature.
 * Core idea: application claim → profile evidence → original user-confirmed information.
 *
 * Records are kept normalized (flat arrays + id references) so each collection
 * can become a database table later.
 */

/**
 * verified            – the user entered or explicitly confirmed it. Usable as evidence.
 * needs_confirmation  – imported / extracted but not yet confirmed. Shown, never used as evidence.
 * draft               – suggested wording or an incomplete record. Never used as evidence.
 *
 * There is intentionally no "verified by Bámi" state: the user is the source of truth.
 */
export type VerificationStatus = "verified" | "needs_confirmation" | "draft";

export type ProfileSource = "user" | "cv_import" | "application" | "suggested";

/** Provenance + verification fields shared by every important record. */
export interface RecordMeta {
  source: ProfileSource;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single factual statement. Building block for responsibilities and outcomes.
 * Suggested rewordings point at the claim they were derived from and stay
 * `draft` until the user confirms they are accurate.
 */
export interface ProfileClaim {
  id: string;
  text: string;
  verificationStatus: VerificationStatus;
  source: ProfileSource;
  sourceRecordId?: string;
  derivedFromClaimId?: string;
}

export type EvidenceRecordType =
  | "experience"
  | "education"
  | "research_project"
  | "achievement"
  | "career_story";

/** A pointer from anywhere in Bámi to a profile record (and optionally one claim inside it). */
export interface EvidenceLink {
  recordType: EvidenceRecordType;
  recordId: string;
  claimId?: string;
}

export interface ProfileLink {
  label: string;
  url: string;
  kind?: "publication" | "dataset" | "portfolio" | "repository" | "other";
}

// ── Personal ────────────────────────────────────────────────────────────────

export interface PersonalProfile extends RecordMeta {
  name: string;
  headline: string;
  currentRole?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
}

// ── Experience ──────────────────────────────────────────────────────────────

export interface ExperienceRecord extends RecordMeta {
  id: string;
  title: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  employmentType?: string;
  summary?: string;
  responsibilities: ProfileClaim[];
  achievementIds: string[];
  skillIds: string[];
}

// ── Education ───────────────────────────────────────────────────────────────

export interface EducationRecord extends RecordMeta {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  location?: string;
  grade?: string;
  thesisTitle?: string;
  coursework?: string[];
  notes?: string;
}

// ── Research & projects ─────────────────────────────────────────────────────

export type ProjectType =
  | "research"
  | "thesis"
  | "engineering"
  | "software"
  | "clinical"
  | "other";

export interface ResearchProjectRecord extends RecordMeta {
  id: string;
  title: string;
  projectType: ProjectType;
  organization?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  objective?: string;
  methods: string[];
  technologies: string[];
  role?: string;
  outcomes: ProfileClaim[];
  skillIds: string[];
  links?: ProfileLink[];
}

// ── Skills ──────────────────────────────────────────────────────────────────

export type SkillCategory =
  | "technical"
  | "research"
  | "clinical"
  | "software"
  | "engineering"
  | "professional"
  | "language"
  | "other";

export type SkillLevel = "familiar" | "working" | "advanced" | "expert";

export interface SkillRecord extends RecordMeta {
  id: string;
  name: string;
  category: SkillCategory;
  level?: SkillLevel;
  evidenceLinks: EvidenceLink[];
}

// ── Achievements ────────────────────────────────────────────────────────────

/** A metric is stored exactly as the user typed it. It is never required and never inferred. */
export interface AchievementMetric {
  value: string;
  context?: string;
}

export interface AchievementRecord extends RecordMeta {
  id: string;
  title: string;
  description: string;
  metric?: AchievementMetric;
  linkedRecordType?: EvidenceRecordType;
  linkedRecordId?: string;
  date?: string;
  notes?: string;
}

// ── Career stories ──────────────────────────────────────────────────────────

export interface CareerStory extends RecordMeta {
  id: string;
  title: string;
  context?: string;
  challenge?: string;
  actions: string[];
  outcome?: string;
  demonstrates: string[];
  usefulFor: string[];
  skillIds: string[];
  evidenceLinks: EvidenceLink[];
}

// ── Eligibility facts vs. preferences ───────────────────────────────────────

/** FACT: where the candidate is (or is not) allowed to work. Feeds Job Analysis critical gates. */
export interface WorkAuthorization extends RecordMeta {
  id: string;
  countryOrRegion: string;
  status: "authorized" | "requires_sponsorship" | "unknown";
  authorizationType?: string;
  expiresAt?: string;
}

export type WorkStyle = "on_site" | "hybrid" | "remote";
export type RelocationPreference = "willing" | "not_willing" | "depends";
export type SponsorshipNeed = "needs_sponsorship" | "no_sponsorship_needed" | "depends";

/** PREFERENCE: what the candidate wants. Deliberately separate from WorkAuthorization. */
export interface CareerPreferences {
  targetRoles: string[];
  industries: string[];
  preferredLocations: string[];
  workStyles: WorkStyle[];
  employmentTypes: string[];
  seniority: string[];
  relocation?: RelocationPreference;
  sponsorshipNeed?: SponsorshipNeed;
  updatedAt: string;
}

// ── Aggregate ───────────────────────────────────────────────────────────────

export interface CareerProfile {
  id: string;
  personal: PersonalProfile;
  experiences: ExperienceRecord[];
  education: EducationRecord[];
  researchProjects: ResearchProjectRecord[];
  skills: SkillRecord[];
  achievements: AchievementRecord[];
  careerStories: CareerStory[];
  workAuthorizations: WorkAuthorization[];
  preferences: CareerPreferences;
  updatedAt: string;
}

export type ProfileCollection =
  | "experiences"
  | "education"
  | "researchProjects"
  | "skills"
  | "achievements"
  | "careerStories"
  | "workAuthorizations";

export type ProfileRecord = CareerProfile[ProfileCollection][number];

/** Collections that can be pointed to by an EvidenceLink, with their link type. */
export const COLLECTION_BY_RECORD_TYPE: Record<EvidenceRecordType, ProfileCollection> = {
  experience: "experiences",
  education: "education",
  research_project: "researchProjects",
  achievement: "achievements",
  career_story: "careerStories",
};

export const RECORD_TYPE_BY_COLLECTION: Partial<Record<ProfileCollection, EvidenceRecordType>> = {
  experiences: "experience",
  education: "education",
  researchProjects: "research_project",
  achievements: "achievement",
  careerStories: "career_story",
};
