import type { FitRecommendation } from "@/types/application";
import type {
  JobRequirement,
  AnalysisMetrics,
  CriticalIssue,
} from "@/types/analysis";

export interface RecommendationOutcome {
  recommendation: FitRecommendation;
  recommendationReason: string;
  bamiTake: string;
  strengths: string[];
  manageableGaps: string[];
}

/**
 * Determine the overall fit recommendation deterministically.
 *
 * Rules:
 * 1. Hard Blockers:
 *    If ANY critical requirement is confirmed unmet and is a hard blocker,
 *    recommendation is strictly "Skip", regardless of whether the fit score is 90%+.
 *
 * 2. Unresolved Critical Requirements:
 *    If a critical requirement needs confirmation and fit is otherwise high (>=80%),
 *    the recommendation is capped at "Stretch" (or "Apply") with an explicit warning,
 *    preventing false confidence until the candidate verifies eligibility.
 *
 * 3. Severe Core Gaps:
 *    If overall fit < 45% or core fit < 40%, recommendation is "Skip" due to
 *    lack of fundamental qualifications.
 *
 * 4. High Fit & Clear Eligibility:
 *    - Overall fit >= 80% AND core fit >= 75% AND no critical blockers -> "Strong Apply"
 *    - Overall fit >= 65% AND core fit >= 60% -> "Apply"
 *    - Overall fit 45%–64% OR several core gaps -> "Stretch"
 */
export function determineRecommendation(
  metrics: AnalysisMetrics,
  criticalIssues: CriticalIssue[],
  requirements: JobRequirement[]
): RecommendationOutcome {
  const { overallFit, coreFit } = metrics;

  // 1. Identify confirmed hard blockers
  const confirmedBlocker = criticalIssues.find(
    (issue) => issue.status === "unmet" && issue.isHardBlocker
  );

  // 2. Identify unconfirmed critical gates
  const unconfirmedCritical = criticalIssues.find(
    (issue) => issue.status === "needs_confirmation"
  );

  // 3. Extract core strengths and manageable gaps
  const strengths = requirements
    .filter(
      (r) =>
        r.importance === "core" &&
        (r.evidenceStrength === "strong" || r.userOverride?.confirmed)
    )
    .map((r) => r.label);

  const manageableGaps = requirements
    .filter(
      (r) =>
        (r.importance === "preferred" ||
          (r.importance === "core" && r.evidenceStrength === "partial")) &&
        r.evidenceStrength !== "strong" &&
        !r.userOverride?.confirmed
    )
    .map((r) => r.label);

  let recommendation: FitRecommendation;
  let recommendationReason: string;

  if (confirmedBlocker) {
    recommendation = "Skip";
    recommendationReason = `Although your experience aligns with aspects of this role (${overallFit}% scored match), a confirmed non-negotiable requirement (${confirmedBlocker.label}) makes you ineligible as currently specified.`;
  } else if (overallFit < 45 || coreFit < 40) {
    recommendation = "Skip";
    recommendationReason =
      "Your profile does not yet demonstrate the core qualifications needed for this role. Key fundamental requirements are absent.";
  } else if (unconfirmedCritical) {
    // High fit but critical uncertainty exists
    if (overallFit >= 75) {
      recommendation = "Stretch";
      recommendationReason = `You appear highly aligned with the core work itself (${overallFit}% fit), but the role specifies that ${unconfirmedCritical.label} is mandatory and your eligibility is not yet confirmed.`;
    } else {
      recommendation = "Stretch";
      recommendationReason = `Several core requirements are only partially supported, and ${unconfirmedCritical.label} needs confirmation before proceeding.`;
    }
  } else {
    // No blockers, all critical items satisfied
    if (overallFit >= 80 && coreFit >= 75) {
      recommendation = "Strong Apply";
      recommendationReason =
        "Your background covers most of the role's core requirements, with particularly strong evidence in your verified experience.";
    } else if (overallFit >= 65) {
      recommendation = "Apply";
      recommendationReason =
        "You match the role well overall. A few manageable gaps exist, but none appear fundamental to performing the job.";
    } else {
      recommendation = "Stretch";
      recommendationReason =
        "You have relevant adjacent experience, but several core requirements are only partially supported.";
    }
  }

  // Synthesize Bámi's Take
  const bamiTake = generateBamiTake(recommendation, metrics, strengths, manageableGaps, confirmedBlocker, unconfirmedCritical);

  return {
    recommendation,
    recommendationReason,
    bamiTake,
    strengths,
    manageableGaps,
  };
}

/**
 * Generate an authentic editorial recommendation quote grounded strictly in verified evidence.
 */
function generateBamiTake(
  recommendation: FitRecommendation,
  metrics: AnalysisMetrics,
  strengths: string[],
  manageableGaps: string[],
  confirmedBlocker?: CriticalIssue,
  unconfirmedCritical?: CriticalIssue
): string {
  if (confirmedBlocker) {
    return `Do not invest time into an application right now. The employer specifies ${confirmedBlocker.label.toLowerCase()} as non-negotiable. Pursuing roles with confirmed eligibility constraints will yield far better outcomes.`;
  }

  if (unconfirmedCritical && metrics.overallFit >= 75) {
    return `Your work experience in ${strengths.slice(0, 3).join(", ").toLowerCase()} strongly aligns with what this team needs. However, before investing time in an application, verify your ${unconfirmedCritical.label.toLowerCase()} status above to ensure you are not filtered out at the gate.`;
  }

  if (recommendation === "Strong Apply") {
    const strengthPhrase =
      strengths.length > 0
        ? `Your strongest positioning is around ${strengths.slice(0, 3).join(", ").toLowerCase()}.`
        : "Your core background matches what this role demands.";
    return `You match most of the role's core requirements. ${strengthPhrase} Ground your application in this proven evidence.`;
  }

  if (recommendation === "Apply") {
    const gapPhrase =
      manageableGaps.length > 0
        ? `address ${manageableGaps.slice(0, 2).join(" and ").toLowerCase()} through adjacent evidence`
        : "emphasize your strongest research and engineering work";
    return `A solid overall match. Frame your application around your core strengths, and ${gapPhrase} where possible.`;
  }

  if (recommendation === "Stretch") {
    const gapPhrase =
      manageableGaps.length > 0
        ? ` explicitly address how your adjacent background bridges ${manageableGaps
            .slice(0, 3)
            .join(", ")
            .toLowerCase()}`
        : " explain how your adjacent background bridges the gaps";
    const gatePhrase = unconfirmedCritical
      ? ` Also confirm your ${unconfirmedCritical.label.toLowerCase()} first, so you are not filtered out at the gate.`
      : "";
    return `This is a reach role. If you pursue it,${gapPhrase}.${gatePhrase}`;
  }

  return "The profile overlap with this opportunity is low. We recommend focusing effort on roles closer to your verified career trajectory.";
}
