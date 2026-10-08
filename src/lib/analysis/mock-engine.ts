import type { JobAnalysis, JobPosting } from "@/types/analysis";
import type { CareerProfile } from "@/types/profile";
import { applyProfileToRequirements } from "@/lib/profile/matching";
import { calculateFit, evaluateCriticalRequirements } from "./scoring";
import { determineRecommendation } from "./recommendation";
import { applyOverrides, type OverrideMap } from "./overrides";

/**
 * Build a complete JobAnalysis from a parsed job and the Career Profile.
 *
 *   job requirements → Career Profile evidence (derived) → scoring → gates → recommendation
 *
 * Pure deterministic transformation: the profile is an input, never a fixture
 * hidden inside the analysis feature.
 */
export function buildJobAnalysis({
  profile,
  job,
  overrides = {},
  now = new Date(),
}: {
  profile: CareerProfile;
  job: JobPosting;
  overrides?: OverrideMap;
  now?: Date;
}): JobAnalysis {
  // 1. Derive evidence strength and gate status from verified profile records
  const derived = applyProfileToRequirements(profile, job.requirements, now);
  const requirements = applyOverrides(derived, overrides);

  // 2. Weighted scores, critical gates, recommendation
  const metrics = calculateFit(requirements);
  const criticalIssues = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, criticalIssues, requirements);

  return {
    id: job.id,
    company: job.company,
    role: job.role,
    location: job.location,
    sourceUrl: job.sourceUrl,
    rawDescription: job.rawDescription,
    overallFit: metrics.overallFit,
    coreFit: metrics.coreFit,
    preferredFit: metrics.preferredFit,
    contextualFit: metrics.contextualFit,
    evidenceCoverage: metrics.evidenceCoverage,
    confidence: metrics.confidence,
    recommendation: outcome.recommendation,
    recommendationReason: outcome.recommendationReason,
    bamiTake: outcome.bamiTake,
    requirements,
    strengths: outcome.strengths,
    manageableGaps: outcome.manageableGaps,
    criticalIssues,
    createdAt: now.toISOString(),
  };
}
