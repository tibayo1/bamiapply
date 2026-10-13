import type { JobAnalysis, JobPosting } from "./analysis";
import type { EvidenceLink, ProfileSource, VerificationStatus, WorkAuthorization } from "./profile";
import type { CVVersion } from "./cv";

/**
 * Core TypeScript types for the Bámi Apply application domain.
 * Structured to map cleanly to a future Supabase/database schema.
 */

/** Fit recommendation labels shown on application cards and analysis results */
export type FitRecommendation =
  | "Strong Apply"
  | "Apply"
  | "Stretch"
  | "Skip";

/** All possible application lifecycle statuses */
export type ApplicationStatus =
  | "Saved"
  | "Preparing"
  | "Ready to Apply"
  | "Applied"
  | "Assessment"
  | "Interview"
  | "Rejected"
  | "Offer"
  | "Withdrawn"
  | "Skipped";

/** Status of an individual document within an application */
export type DocumentStatus = "Not started" | "In progress" | "Complete";

/**
 * Core application record.
 * Maps to the `applications` table in the future database schema.
 */
export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;

  /** Match score computed by the deterministic evidence-based engine, 0–100. */
  fitScore: number;

  /** Human-readable recommendation derived from fitScore and profile analysis */
  recommendation: FitRecommendation;

  /** Current stage in the application lifecycle */
  status: ApplicationStatus;

  /** ISO 8601 date string — when this record was last modified */
  updatedAt: string;

  /** Status of the tailored CV for this application */
  cvStatus: DocumentStatus;

  /** Status of the cover letter for this application */
  coverLetterStatus: DocumentStatus;

  /** Number of application questions answered */
  questionsCompleted: number;

  /** Total number of application questions */
  questionsTotal: number;

  /** Optional: direct link to the job posting */
  jobUrl?: string;

  /** Optional: raw job description text */
  jobDescription?: string;
}

/** A historical, confirmed excerpt; live Profile changes cannot rewrite it. */
export interface ApplicationEvidenceSnapshot {
  link: EvidenceLink;
  recordTitle: string;
  sourceOrganization?: string;
  excerpt: string;
  source: ProfileSource;
  sourceRecordId?: string;
  derivedFromClaimId?: string;
  recordUpdatedAt: string;
  verificationStatus: "verified";
}

export interface ApplicationAnalysisSnapshot {
  id: string;
  capturedAt: string;
  profileRevision: string;
  profileUpdatedAt: string;
  analysis: JobAnalysis;
  evidence: ApplicationEvidenceSnapshot[];
  /** Status pointers only: unconfirmed wording must never become an application claim. */
  unconfirmedEvidence: { link: EvidenceLink; verificationStatus: Exclude<VerificationStatus, "verified"> }[];
  /** Facts/statuses at capture time, used to verify historical eligibility gates. */
  authorizations: WorkAuthorization[];
}

export interface ApplicationStatusEvent {
  status: ApplicationStatus;
  changedAt: string;
  reason?: string;
}

/** Independently persisted lifecycle state and immutable assessment history. */
export interface ApplicationRecord extends Application {
  profileId: string;
  job: JobPosting;
  createdAt: string;
  snapshots: ApplicationAnalysisSnapshot[];
  statusHistory: ApplicationStatusEvent[];
  /** Immutable prepared documents; absent only on records saved before CV support. */
  cvVersions?: CVVersion[];
  skipReason?: string;
}

/**
 * Summary counts grouped by status for the dashboard filter tabs.
 */
export interface ApplicationStatusCounts {
  all: number;
  preparing: number;
  applied: number;
  interviews: number;
  offers: number;
}

/** Tabs on the dashboard / applications list. */
export type ApplicationFilter = keyof ApplicationStatusCounts;

/** Sort orders offered in the list. */
export type ApplicationSort = "updated" | "fit" | "company";
