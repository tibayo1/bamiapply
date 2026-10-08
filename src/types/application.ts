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

  /** AI-derived match score, 0–100 */
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
