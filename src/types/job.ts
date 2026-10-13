import type { JobPosting, RequirementCategory, RequirementImportance, RequirementMatch } from "./analysis";

/** Reviewed employer requirements. Candidate wording is always resolved from Profile. */
export interface JobRequirementDraft {
  id: string;
  label: string;
  sourceText: string;
  importance: RequirementImportance;
  category: RequirementCategory;
  profileMatches: RequirementMatch[];
  isHardBlocker: boolean;
  acceptedRegions: string;
  sponsorship: "unknown" | "available" | "unavailable";
}

export interface JobDraftInput {
  company: string;
  role: string;
  location: string;
  sourceUrl: string;
  rawDescription: string;
  requirements: JobRequirementDraft[];
}

/** An immutable, reviewed posting belonging to one Profile's browser workspace. */
export interface ReviewedJobRecord {
  id: string;
  profileId: string;
  posting: JobPosting;
  createdAt: string;
}
