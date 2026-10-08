import type {
  JobRequirement,
  AnalysisMetrics,
  CriticalIssue,
  AnalysisConfidence,
} from "@/types/analysis";

/**
 * Deterministic scoring engine for Bámi Apply.
 *
 * Core product principle:
 * requirements → evidence → weighted assessment → critical checks → recommendation
 *
 * Weight distribution:
 * - Core requirements: 70% of scored fit
 * - Preferred requirements: 20% of scored fit
 * - Contextual requirements: 10% of scored fit
 * - Critical requirements: Evaluated separately as recommendation gates.
 */

const NOMINAL_WEIGHTS = {
  core: 0.7,
  preferred: 0.2,
  contextual: 0.1,
} as const;

const EVIDENCE_VALUES: Record<string, number> = {
  strong: 1.0,
  partial: 0.5,
  none: 0.0,
};

/**
 * Calculate quantitative metrics from parsed job requirements.
 * Excludes critical requirements from the base percentage (they act as gates).
 * Excludes "needs_confirmation" items from group denominators to avoid penalizing incomplete profile data,
 * but factors them into the overall confidence score.
 */
export function calculateFit(requirements: JobRequirement[]): AnalysisMetrics {
  const nonCritical = requirements.filter((r) => r.importance !== "critical");

  function evaluateGroup(importance: "core" | "preferred" | "contextual") {
    const items = nonCritical.filter((r) => r.importance === importance);
    if (items.length === 0) return null;

    let totalPoints = 0;
    let scorableCount = 0;

    for (const item of items) {
      // Check user override first if present
      const strength = item.userOverride?.confirmed
        ? "strong"
        : item.evidenceStrength;

      if (strength in EVIDENCE_VALUES) {
        totalPoints += EVIDENCE_VALUES[strength];
        scorableCount += 1;
      }
      // If "needs_confirmation", it's excluded from this group's score denominator
    }

    if (scorableCount === 0) return null;
    return totalPoints / scorableCount;
  }

  const coreScore = evaluateGroup("core");
  const preferredScore = evaluateGroup("preferred");
  const contextualScore = evaluateGroup("contextual");

  // Determine active weights and re-distribute proportionally if any group has no scorable items
  let totalActiveWeight = 0;
  if (coreScore !== null) totalActiveWeight += NOMINAL_WEIGHTS.core;
  if (preferredScore !== null) totalActiveWeight += NOMINAL_WEIGHTS.preferred;
  if (contextualScore !== null) totalActiveWeight += NOMINAL_WEIGHTS.contextual;

  let overallWeighted = 0;
  if (totalActiveWeight > 0) {
    if (coreScore !== null) {
      overallWeighted += (coreScore * NOMINAL_WEIGHTS.core) / totalActiveWeight;
    }
    if (preferredScore !== null) {
      overallWeighted +=
        (preferredScore * NOMINAL_WEIGHTS.preferred) / totalActiveWeight;
    }
    if (contextualScore !== null) {
      overallWeighted +=
        (contextualScore * NOMINAL_WEIGHTS.contextual) / totalActiveWeight;
    }
  }

  // Calculate evidence coverage (percentage of non-critical requirements with strong or partial evidence)
  const coveredItems = nonCritical.filter((r) => {
    const strength = r.userOverride?.confirmed ? "strong" : r.evidenceStrength;
    return strength === "strong" || strength === "partial";
  });
  const evidenceCoverage =
    nonCritical.length > 0
      ? Math.round((coveredItems.length / nonCritical.length) * 100)
      : 100;

  // Calculate confidence
  const confidence = calculateAnalysisConfidence(requirements);

  return {
    overallFit: Math.round(overallWeighted * 100),
    coreFit: coreScore !== null ? Math.round(coreScore * 100) : 0,
    preferredFit: preferredScore !== null ? Math.round(preferredScore * 100) : 0,
    contextualFit:
      contextualScore !== null ? Math.round(contextualScore * 100) : 0,
    evidenceCoverage,
    confidence,
  };
}

/**
 * Determine analysis confidence based on proportion of confirmed data.
 * - High: Most important requirements have concrete determinations, 0 critical unknowns.
 * - Medium: Some requirements or 1 critical item need confirmation.
 * - Low: >40% of items need confirmation.
 */
export function calculateAnalysisConfidence(
  requirements: JobRequirement[]
): AnalysisConfidence {
  const total = requirements.length;
  if (total === 0) return "Low";

  const criticalItems = requirements.filter((r) => r.importance === "critical");
  const criticalUnknowns = criticalItems.filter((r) => {
    if (r.userOverride?.confirmed !== undefined) return false;
    return (
      r.evidenceStrength === "needs_confirmation" ||
      r.criticalStatus === "needs_confirmation"
    );
  });

  const allUnknowns = requirements.filter((r) => {
    if (r.userOverride?.confirmed !== undefined) return false;
    return r.evidenceStrength === "needs_confirmation";
  });

  const unknownRatio = allUnknowns.length / total;

  if (unknownRatio > 0.4) {
    return "Low";
  }

  if (criticalUnknowns.length > 0 || unknownRatio > 0.15) {
    return "Medium";
  }

  return "High";
}

/**
 * Evaluate critical requirements independently of base fit score.
 */
export function evaluateCriticalRequirements(
  requirements: JobRequirement[]
): CriticalIssue[] {
  const criticals = requirements.filter((r) => r.importance === "critical");
  const issues: CriticalIssue[] = [];

  for (const item of criticals) {
    let status: "satisfied" | "unmet" | "needs_confirmation" =
      item.criticalStatus || "needs_confirmation";

    // Check user override if set
    if (item.userOverride !== undefined) {
      status = item.userOverride.confirmed ? "satisfied" : "unmet";
    } else if (item.evidenceStrength === "strong") {
      status = "satisfied";
    } else if (item.evidenceStrength === "none" && item.isHardBlocker) {
      status = "unmet";
    } else if (item.evidenceStrength === "needs_confirmation") {
      status = "needs_confirmation";
    }

    issues.push({
      id: `crit-${item.id}`,
      requirementId: item.id,
      label: item.label,
      category: item.category,
      status,
      isHardBlocker: item.isHardBlocker ?? true,
      message:
        item.rationale ||
        (status === "unmet"
          ? `Non-negotiable requirement: ${item.label} is currently not satisfied.`
          : status === "needs_confirmation"
          ? `The role specifies that ${item.label} is mandatory, but your Career Profile does not yet have this verified.`
          : `Verified: ${item.label} is satisfied.`),
      confirmationQuestion:
        item.confirmationQuestion ||
        `Do you meet the mandatory requirement for ${item.label}?`,
      resolutionOptions: [
        { id: "satisfy", label: "I have authorization", action: "satisfy" },
        { id: "block", label: "I need sponsorship", action: "block" },
        { id: "unsure", label: "Not sure", action: "unsure" },
      ],
    });
  }

  return issues;
}
