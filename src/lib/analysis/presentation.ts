import type { CandidateEvidence, CriticalIssue, JobRequirement } from "@/types/analysis";

/** Display evidence is usable only when it retains its verified Profile link. */
export function isVerifiedProfileEvidence(evidence: CandidateEvidence): boolean {
  return (
    evidence.status === "verified" &&
    Boolean(evidence.link) &&
    (evidence.strength === "strong" || evidence.strength === "partial")
  );
}

export function evidenceVerificationLabel(evidence: CandidateEvidence): string {
  if (isVerifiedProfileEvidence(evidence)) return "Verified";
  if (evidence.status === "draft") return "Draft · not scored";
  if (evidence.status === "needs_confirmation") return "Needs confirmation · not scored";
  return "Unverified · not scored";
}

/** Overrides may affect an assessment, but cannot create Profile proof points. */
export function getVerifiedCoreStrengths(requirements: JobRequirement[]) {
  return requirements.flatMap((requirement) => {
    if (requirement.importance !== "core" || requirement.evidenceStrength !== "strong") {
      return [];
    }
    const evidence = requirement.evidence?.find(
      (item) => item.strength === "strong" && isVerifiedProfileEvidence(item)
    );
    return evidence ? [{ requirement, evidence }] : [];
  });
}

/** Read the evaluated gates used for the recommendation, separate from fit. */
export function summarizeEligibility(issues: CriticalIssue[]) {
  return {
    total: issues.length,
    satisfied: issues.filter((issue) => issue.status === "satisfied").length,
    unmet: issues.filter((issue) => issue.status === "unmet").length,
    pending: issues.filter((issue) => issue.status === "needs_confirmation").length,
  };
}
