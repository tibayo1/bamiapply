import type {
  ExperienceRecord,
  ProfileClaim,
  ResearchProjectRecord,
} from "@/types/profile";

/** Adding a new fact is deliberate user entry, independently of its parent status. */
export function createUserClaim(
  text: string,
  id: string,
  sourceRecordId?: string
): ProfileClaim {
  return {
    id,
    text: text.trim(),
    verificationStatus: "verified",
    source: "user",
    ...(sourceRecordId ? { sourceRecordId } : {}),
  };
}

/** Claim identity and provenance survive edits; changed facts need fresh confirmation. */
export function updateClaimText(
  claims: ProfileClaim[],
  claimId: string,
  text: string
): ProfileClaim[] {
  return claims.map((claim) => {
    if (claim.id !== claimId) return claim;
    const factChanged = claim.text.trim() !== text.trim();
    return {
      ...claim,
      text,
      verificationStatus:
        factChanged && claim.verificationStatus === "verified"
          ? "needs_confirmation"
          : claim.verificationStatus,
    };
  });
}

export function removeClaim(claims: ProfileClaim[], claimId: string): ProfileClaim[] {
  return claims.filter((claim) => claim.id !== claimId);
}

function prepareClaimsForSave(claims: ProfileClaim[]): ProfileClaim[] {
  return claims.map((claim) => ({ ...claim, text: claim.text.trim() }));
}

type ExperienceFormValue = Partial<ExperienceRecord> &
  Pick<ExperienceRecord, "responsibilities" | "skillIds" | "achievementIds" | "source">;

/** Ordinary form saving must never promote child claims with the parent status. */
export function buildExperienceFormValue(
  initial: Partial<ExperienceRecord> | undefined,
  fields: Partial<ExperienceRecord> & Pick<ExperienceRecord, "responsibilities">
): ExperienceFormValue {
  return {
    ...initial,
    ...fields,
    responsibilities: prepareClaimsForSave(fields.responsibilities),
    skillIds: initial?.skillIds ?? [],
    achievementIds: initial?.achievementIds ?? [],
    source: initial?.source ?? "user",
  };
}

type ResearchProjectFormValue = Partial<ResearchProjectRecord> &
  Pick<ResearchProjectRecord, "outcomes" | "skillIds" | "source">;

export function buildResearchProjectFormValue(
  initial: Partial<ResearchProjectRecord> | undefined,
  fields: Partial<ResearchProjectRecord> & Pick<ResearchProjectRecord, "outcomes">
): ResearchProjectFormValue {
  return {
    ...initial,
    ...fields,
    outcomes: prepareClaimsForSave(fields.outcomes),
    skillIds: initial?.skillIds ?? [],
    source: initial?.source ?? "user",
  };
}
