import type { FitRecommendation } from "./application";
import type { EvidenceLink, VerificationStatus } from "./profile";

/**
 * Importance levels for job requirements.
 * Critical: non-negotiable conditions (eligibility, mandatory license, etc.)
 * Core: central to performing the job (70% of scored fit)
 * Preferred: useful but not essential (20% of scored fit)
 * Contextual: signals affecting overall alignment (10% of scored fit)
 */
export type RequirementImportance =
  | "critical"
  | "core"
  | "preferred"
  | "contextual";

/**
 * Strength of candidate evidence found for a requirement.
 */
export type EvidenceStrength =
  | "strong"
  | "partial"
  | "none"
  | "needs_confirmation";

/**
 * Resolved candidate evidence attached to a requirement for UI display.
 */
export interface CandidateEvidence {
  id: string;
  sourceType: "experience" | "education" | "research" | "skill" | "achievement";
  sourceTitle: string;
  sourceOrganization?: string;
  evidenceText: string;
  strength: EvidenceStrength;
  link?: EvidenceLink;
  status?: VerificationStatus;
}

/**
 * Broad categories for requirements.
 */
export type RequirementCategory =
  | "education"
  | "experience"
  | "skill"
  | "industry"
  | "language"
  | "location"
  | "work_authorization"
  | "certification"
  | "license"
  | "seniority"
  | "other";

/**
 * A pointer from a job requirement into the Career Profile.
 * The analysis never stores candidate evidence text: the excerpt is always
 * resolved from the underlying profile record/claim, so it stays traceable.
 *
 * direct   – the record demonstrates the requirement itself.
 * adjacent – related experience that only partly covers it.
 */
export interface RequirementMatch {
  link: EvidenceLink;
  relevance: "direct" | "adjacent";
}

/**
 * Work-eligibility rule for a critical requirement. Facts about the candidate
 * are read from the Career Profile's work authorizations.
 */
export interface EligibilityRule {
  /** Any of these regions satisfies the rule, e.g. Switzerland, EU, EFTA. */
  acceptedRegions: string[];
  /** Whether the employer offers visa sponsorship. null means not confirmed. */
  sponsorshipAvailable: boolean | null;
}

/**
 * A discrete requirement extracted from the employer's job description.
 */
export interface JobRequirement {
  id: string;
  label: string;
  description?: string;
  /** Short verbatim or condensed quote from the job description */
  sourceText?: string;
  importance: RequirementImportance;
  category: RequirementCategory;
  /** Derived from linked, verified Career Profile records (see applyProfileToRequirements). */
  evidenceStrength: EvidenceStrength;
  /** Links into the Career Profile that support this requirement. */
  profileMatches?: RequirementMatch[];
  /** Resolved evidence items populated from the profile for display */
  evidence?: CandidateEvidence[];
  eligibility?: EligibilityRule;
  rationale?: string;
  isHardBlocker?: boolean;
  confirmationQuestion?: string;
  criticalStatus?: "satisfied" | "unmet" | "needs_confirmation";
  /** Optional user override in local state */
  userOverride?: {
    confirmed: boolean;
    note?: string;
  };
}

/**
 * Job-side requirement as produced by (future) AI extraction: what the employer
 * wants and which profile records plausibly answer it. No candidate facts live
 * here; strength and status are derived from the profile.
 */
export interface JobRequirementSpec
  extends Omit<JobRequirement, "evidenceStrength" | "criticalStatus" | "userOverride"> {
  /** Optional nuance shown when the derived strength is partial or none. */
  notes?: Partial<Record<"partial" | "none", string>>;
}

/** A reviewed employer posting, with candidate evidence resolved separately. */
export interface JobPosting {
  id: string;
  company: string;
  role: string;
  location: string;
  sourceUrl?: string;
  rawDescription?: string;
  requirements: JobRequirementSpec[];
}

/**
 * Assessment confidence level, indicating how complete the profile & job information is.
 */
export type AnalysisConfidence = "High" | "Medium" | "Low";

/**
 * Quantitative metrics calculated from deterministic scoring.
 */
export interface AnalysisMetrics {
  overallFit: number;
  coreFit: number;
  preferredFit: number;
  contextualFit: number;
  evidenceCoverage: number;
  confidence: AnalysisConfidence;
}

/**
 * Critical requirement or deal-breaker issue requiring user awareness.
 */
export interface CriticalIssue {
  id: string;
  requirementId: string;
  label: string;
  category: RequirementCategory;
  status: "satisfied" | "unmet" | "needs_confirmation";
  isHardBlocker: boolean;
  message: string;
  confirmationQuestion?: string;
  resolutionOptions?: {
    id: string;
    label: string;
    action: "satisfy" | "block" | "unsure";
  }[];
}

/**
 * Complete Job Analysis object.
 */
export interface JobAnalysis {
  id: string;
  company: string;
  role: string;
  location: string;
  sourceUrl?: string;
  rawDescription?: string;
  overallFit: number;
  coreFit: number;
  preferredFit: number;
  contextualFit: number;
  evidenceCoverage: number;
  confidence: AnalysisConfidence;
  recommendation: FitRecommendation;
  recommendationReason: string;
  bamiTake: string;
  requirements: JobRequirement[];
  strengths: string[];
  manageableGaps: string[];
  criticalIssues: CriticalIssue[];
  createdAt: string;
}
