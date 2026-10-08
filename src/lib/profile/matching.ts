import type { CareerProfile } from "@/types/profile";
import type {
  CandidateEvidence,
  EvidenceStrength,
  JobRequirement,
  JobRequirementSpec,
} from "@/types/analysis";
import { resolveEvidenceLink, type ResolvedEvidence } from "./evidence";
import {
  getWorkAuthorizationForRegions,
  workAuthorizationToEligibility,
} from "./selectors";

/**
 * Requirement ⇄ Career Profile matching.
 *
 *   JobRequirement → EvidenceLink → Career Profile record → verified claim
 *
 * Job Analysis stores no candidate evidence of its own. Strength is DERIVED
 * here from the profile, so editing, un-verifying or deleting a record changes
 * the analysis.
 */

export interface RequirementEvidence extends ResolvedEvidence {
  relevance: "direct" | "adjacent";
}

/**
 * Evidence from the Career Profile for one requirement.
 * Verified-only by default; pass `includeUnverified` to also list items that
 * still await confirmation (for honest display, never for scoring).
 */
export function getProfileEvidenceForRequirement(
  profile: CareerProfile,
  requirement: Pick<JobRequirement, "profileMatches">,
  options: { includeUnverified?: boolean } = {}
): RequirementEvidence[] {
  const out: RequirementEvidence[] = [];
  for (const match of requirement.profileMatches ?? []) {
    const resolved = resolveEvidenceLink(profile, match.link);
    if (!resolved) continue; // dangling link: record or claim was removed
    if (!options.includeUnverified && !resolved.usable) continue;
    out.push({ ...resolved, relevance: match.relevance });
  }
  return out;
}

/** strong: verified direct evidence · partial: verified adjacent only · needs_confirmation: only unverified evidence · none */
export function deriveEvidenceStrength(
  profile: CareerProfile,
  requirement: Pick<JobRequirement, "profileMatches">
): EvidenceStrength {
  const all = getProfileEvidenceForRequirement(profile, requirement, { includeUnverified: true });
  const usable = all.filter((e) => e.usable);
  if (usable.some((e) => e.relevance === "direct")) return "strong";
  if (usable.some((e) => e.relevance === "adjacent")) return "partial";
  if (all.length > 0) return "needs_confirmation";
  return "none";
}

const STRENGTH_FOR_STATUS = {
  satisfied: "strong",
  unmet: "none",
  needs_confirmation: "needs_confirmation",
} as const;

/**
 * Turn job-side requirement specs into scoreable requirements by reading the
 * Career Profile. Critical work-authorization gates read the candidate's work
 * authorization FACTS; everything else reads linked evidence.
 */
export function applyProfileToRequirements(
  profile: CareerProfile,
  specs: JobRequirementSpec[],
  now: Date = new Date()
): JobRequirement[] {
  return specs.map((spec) => {
    const { notes, ...rest } = spec;

    const rawEvs = getProfileEvidenceForRequirement(profile, spec, { includeUnverified: true });
    const evidence: CandidateEvidence[] = rawEvs.map((ev) => ({
      id: `ev-${ev.recordId}-${ev.claim?.id ?? "rec"}`,
      sourceType:
        ev.recordType === "research_project"
          ? "research"
          : ev.recordType === "career_story"
          ? "experience"
          : (ev.recordType as "experience" | "education" | "achievement"),
      sourceTitle: ev.recordTitle,
      sourceOrganization: ev.organization,
      evidenceText: ev.excerpt,
      strength: ev.relevance === "direct" && ev.usable ? "strong" : "partial",
      link: ev.link,
      status: ev.status,
    }));

    if (spec.importance === "critical") {
      if (spec.eligibility) {
        const entry = getWorkAuthorizationForRegions(profile, spec.eligibility.acceptedRegions);
        const status = workAuthorizationToEligibility(entry, {
          sponsorshipAvailable: spec.eligibility.sponsorshipAvailable,
          now,
        });
        return {
          ...rest,
          criticalStatus: status,
          evidenceStrength: STRENGTH_FOR_STATUS[status],
          evidence: evidence.length > 0 ? evidence : undefined,
        };
      }
      // Other critical gates: absence of evidence is "needs confirmation",
      // never an assumed failure.
      const strength = deriveEvidenceStrength(profile, spec);
      const satisfied = strength === "strong";
      return {
        ...rest,
        criticalStatus: satisfied ? "satisfied" : "needs_confirmation",
        evidenceStrength: satisfied ? "strong" : "needs_confirmation",
        evidence: evidence.length > 0 ? evidence : undefined,
      };
    }

    const evidenceStrength = deriveEvidenceStrength(profile, spec);
    const note =
      evidenceStrength === "partial" || evidenceStrength === "none"
        ? notes?.[evidenceStrength]
        : undefined;
    return {
      ...rest,
      evidenceStrength,
      rationale: note ?? rest.rationale,
      evidence: evidence.length > 0 ? evidence : undefined,
    };
  });
}
