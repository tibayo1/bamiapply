import assert from "node:assert/strict";
import { createDemoProfile, ID } from "./mock-profile";
import { isUsableEvidence } from "./evidence";
import {
  deriveEvidenceStrength,
  getProfileEvidenceForRequirement,
} from "./matching";
import { profileReducer } from "./reducer";
import { detectConflicts, mergeExperienceRecords } from "./import";
import { getMockCvExtractionFixture } from "./import-fixture";
import { searchProfile } from "./search";
import {
  getWorkAuthorizationForRegions,
  workAuthorizationToEligibility,
} from "./selectors";
import type { JobRequirementSpec } from "@/types/analysis";

console.log("── Running Bámi Career Profile Test Suite ──");

// ── Test 1: Unverified claims MUST NEVER count as verified evidence ──────────
{
  const profile = createDemoProfile();
  const draftClaimId = "c-mh-suggested-pm";

  // Find the draft claim
  const unconfirmedClaim = profile.experiences
    .flatMap((e) => e.responsibilities)
    .find((c) => c.id === draftClaimId);

  assert.ok(unconfirmedClaim, "Demo profile should contain draft claim c-mh-suggested-pm");
  assert.equal(isUsableEvidence(unconfirmedClaim.verificationStatus), false);

  // Attempt to match requirement against an unconfirmed claim only
  const spec: JobRequirementSpec = {
    id: "test-req-1",
    label: "Preventive Maintenance",
    importance: "core",
    category: "experience",
    profileMatches: [
      {
        link: {
          recordType: "experience",
          recordId: ID.expMarigold,
          claimId: draftClaimId,
        },
        relevance: "direct",
      },
    ],
  };

  const strength = deriveEvidenceStrength(profile, spec);
  assert.equal(
    strength,
    "needs_confirmation",
    "Unconfirmed evidence must result in 'needs_confirmation', NEVER 'strong'"
  );

  const usableEvidence = getProfileEvidenceForRequirement(profile, spec, {
    includeUnverified: false,
  });
  assert.equal(
    usableEvidence.length,
    0,
    "Usable evidence list must be empty when only unconfirmed items match"
  );

  console.log("✓ Test 1 passed: Unconfirmed claims never count as verified evidence");
}

// ── Test 2: Verification promotion immediately makes evidence usable ─────────
{
  const profile = createDemoProfile();
  const draftClaimId = "c-mh-suggested-pm";

  // Promote unconfirmed claim to verified
  const updatedProfile = profileReducer(profile, {
    type: "SET_VERIFICATION_STATUS",
    collection: "experiences",
    id: ID.expMarigold,
    claimId: draftClaimId,
    status: "verified",
  });

  const promotedClaim = updatedProfile.experiences
    .find((e) => e.id === ID.expMarigold)
    ?.responsibilities.find((c) => c.id === draftClaimId);

  assert.equal(promotedClaim?.verificationStatus, "verified");

  const spec: JobRequirementSpec = {
    id: "test-req-2",
    label: "Preventive Maintenance",
    importance: "core",
    category: "experience",
    profileMatches: [
      {
        link: {
          recordType: "experience",
          recordId: ID.expMarigold,
          claimId: draftClaimId,
        },
        relevance: "direct",
      },
    ],
  };

  const strength = deriveEvidenceStrength(updatedProfile, spec);
  assert.equal(
    strength,
    "strong",
    "Promoted claim must now yield 'strong' evidence"
  );

  console.log("✓ Test 2 passed: Verification promotion immediately elevates evidence strength");
}

// ── Test 3: Conflict detection and merge preserves existing verified claims ──
{
  const profile = createDemoProfile();
  const fixture = getMockCvExtractionFixture();

  const conflicts = detectConflicts(profile, fixture);
  assert.ok(conflicts.length > 0, "Duplicate employer should be detected as conflict");

  const existingExp = profile.experiences.find((e) => e.id === ID.expDoctoral)!;
  const importedExp = fixture.experiences.find(
    (e) => e.organization === "Kadir Has University"
  )!;

  const originalVerifiedClaimsCount = existingExp.responsibilities.filter(
    (c) => c.verificationStatus === "verified"
  ).length;

  const merged = mergeExperienceRecords(existingExp, importedExp);

  // Original claims must still be present and verified
  const retainedVerified = merged.responsibilities.filter(
    (c) => c.verificationStatus === "verified"
  );
  assert.ok(
    retainedVerified.length >= originalVerifiedClaimsCount,
    "Merge must not discard existing verified claims"
  );

  // New claims from import should be appended
  assert.ok(
    merged.responsibilities.length > existingExp.responsibilities.length,
    "New claims must be appended"
  );

  console.log("✓ Test 3 passed: Conflict merge preserves existing verified claims and appends new claims");
}

// ── Test 4: Cascading cleanup when record is deleted ─────────────────────────
{
  const profile = createDemoProfile();

  // Create a skill linked to expDoctoral
  const skillWithLink = {
    id: "skill-linked-test",
    name: "Specialized Experimental Method",
    category: "technical" as const,
    verificationStatus: "verified" as const,
    source: "user" as const,
    evidenceLinks: [
      {
        recordType: "experience" as const,
        recordId: ID.expDoctoral,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const withSkill = profileReducer(profile, {
    type: "UPSERT_RECORD",
    collection: "skills",
    record: skillWithLink,
  });

  assert.equal(
    withSkill.skills.find((s) => s.id === "skill-linked-test")?.evidenceLinks.length,
    1
  );

  // Delete the experience record
  const afterDelete = profileReducer(withSkill, {
    type: "REMOVE_RECORD",
    collection: "experiences",
    id: ID.expDoctoral,
  });

  const cleanedSkill = afterDelete.skills.find(
    (s) => s.id === "skill-linked-test"
  );
  assert.equal(
    cleanedSkill?.evidenceLinks.length,
    0,
    "Evidence link pointing to deleted experience must be cleaned up"
  );

  console.log("✓ Test 4 passed: Cascading cleanup removes dangling links upon record deletion");
}

// ── Test 5: Cross-collection search returns relevant records and claims ───────
{
  const profile = createDemoProfile();

  const resultsKadir = searchProfile(profile, "Kadir Has");
  assert.ok(resultsKadir.length > 0, "Should find Kadir Has university records");
  assert.ok(
    resultsKadir.some((r) => r.section === "experience" || r.section === "education")
  );

  const resultsHaptic = searchProfile(profile, "Haptic");
  assert.ok(resultsHaptic.length > 0, "Should find Haptic research/experience");

  const resultsSkill = searchProfile(profile, "Python");
  assert.ok(resultsSkill.some((r) => r.section === "skills"));

  console.log("✓ Test 5 passed: Cross-collection search finds matching records and claims accurately");
}

// ── Test 6: Work authorization gates critical eligibility deterministically ─
{
  const profile = createDemoProfile();

  // Baseline demo has Switzerland as needs_confirmation
  const swissAuth = getWorkAuthorizationForRegions(profile, ["Switzerland"]);
  const statusUnknown = workAuthorizationToEligibility(swissAuth, {
    sponsorshipAvailable: false,
  });
  assert.equal(
    statusUnknown,
    "needs_confirmation",
    "Unconfirmed authorization status yields 'needs_confirmation'"
  );

  // When sponsorship is required but NOT offered by employer
  const authNeedsSponsorship = {
    id: "auth-spon",
    countryOrRegion: "Switzerland",
    status: "requires_sponsorship" as const,
    verificationStatus: "verified" as const,
    source: "user" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const statusUnmet = workAuthorizationToEligibility(authNeedsSponsorship, {
    sponsorshipAvailable: false,
  });
  assert.equal(
    statusUnmet,
    "unmet",
    "Candidate requiring sponsorship when role offers none is an 'unmet' hard blocker"
  );

  // When candidate is authorized
  const authAuthorized = {
    id: "auth-valid",
    countryOrRegion: "Switzerland",
    status: "authorized" as const,
    verificationStatus: "verified" as const,
    source: "user" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const statusSatisfied = workAuthorizationToEligibility(authAuthorized, {
    sponsorshipAvailable: false,
  });
  assert.equal(
    statusSatisfied,
    "satisfied",
    "Authorized status satisfies critical eligibility"
  );

  console.log("✓ Test 6 passed: Work authorization deterministically gates job eligibility");
}

// ── Test 7: Exact metric preservation ─────────────────────────────────────────
{
  const profile = createDemoProfile();

  const exactValue = "120 participants across 6 protocols";
  const exactContext = "Controlled human psychophysics study";

  const newAchievement = {
    id: "ach-exact-metric",
    title: "Large Scale Trial Execution",
    description: "Conducted psychophysics testing.",
    metric: {
      value: exactValue,
      context: exactContext,
    },
    verificationStatus: "verified" as const,
    source: "user" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedProfile = profileReducer(profile, {
    type: "UPSERT_RECORD",
    collection: "achievements",
    record: newAchievement,
  });

  const saved = updatedProfile.achievements.find(
    (a) => a.id === "ach-exact-metric"
  );
  assert.equal(saved?.metric?.value, exactValue);
  assert.equal(saved?.metric?.context, exactContext);

  console.log("✓ Test 7 passed: Metrics and context strings are preserved verbatim without alteration");
}

console.log("\n✨ All 7 Career Profile test cases passed with 0 errors!");
