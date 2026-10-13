import assert from "node:assert/strict";
import type { ExperienceRecord, ProfileClaim, ResearchProjectRecord } from "@/types/profile";
import {
  buildExperienceFormValue,
  buildResearchProjectFormValue,
  createUserClaim,
  removeClaim,
  updateClaimText,
} from "./claim-editing";

const confirmed: ProfileClaim = {
  id: "claim-confirmed",
  text: "Maintained patient monitors",
  verificationStatus: "verified",
  source: "cv_import",
  sourceRecordId: "import-original-record",
};
const suggested: ProfileClaim = {
  id: "claim-suggested",
  text: "Led maintenance planning",
  verificationStatus: "draft",
  source: "suggested",
  sourceRecordId: "experience-original",
  derivedFromClaimId: confirmed.id,
};
const imported: ProfileClaim = {
  id: "claim-imported",
  text: "Documented inspection procedures",
  verificationStatus: "needs_confirmation",
  source: "cv_import",
  sourceRecordId: "import-original-record",
};
const originalClaims = [confirmed, suggested, imported];

console.log("── Running Career Profile Claim Editing Tests ──");

// Removing a sibling and rearranging the remaining claims must never reassign IDs.
{
  const remaining = removeClaim(originalClaims, confirmed.id);
  const rearranged = [remaining[1], remaining[0]];
  const edited = updateClaimText(rearranged, suggested.id, "Suggested maintenance wording");
  const saved = buildExperienceFormValue(
    { id: "experience-current", responsibilities: originalClaims, verificationStatus: "verified" },
    { responsibilities: edited, verificationStatus: "verified" }
  );

  assert.deepEqual(saved.responsibilities, [imported, { ...suggested, text: "Suggested maintenance wording" }]);
  assert.deepEqual(saved.responsibilities.map((claim) => claim.id), [imported.id, suggested.id]);
  assert.equal(saved.responsibilities[1].derivedFromClaimId, confirmed.id);
  assert.equal(saved.responsibilities[0].sourceRecordId, "import-original-record");
  assert.deepEqual(originalClaims, [confirmed, suggested, imported]);
  console.log("✓ Deleting and reordering claims preserves identity, status, and provenance");
}

// Parent verification controls the record; it must not blanket-confirm its children.
{
  const experience = buildExperienceFormValue(
    { source: "cv_import", verificationStatus: "needs_confirmation" },
    { responsibilities: originalClaims, verificationStatus: "verified" }
  );
  const project = buildResearchProjectFormValue(
    { source: "suggested", verificationStatus: "draft" },
    { outcomes: originalClaims, verificationStatus: "verified" }
  );

  assert.deepEqual(experience.responsibilities, originalClaims);
  assert.deepEqual(project.outcomes, originalClaims);
  assert.equal(experience.source, "cv_import");
  assert.equal(project.source, "suggested");
  assert.equal(experience.responsibilities[1].verificationStatus, "draft");
  assert.equal(project.outcomes[2].verificationStatus, "needs_confirmation");
  console.log("✓ Saving a verified parent never confirms draft or imported claims");
}

// Editing an already-confirmed fact makes its existing evidence link unusable
// until the user explicitly reconfirms it; lineage and unrelated claims survive.
{
  const updated = updateClaimText(originalClaims, confirmed.id, "Maintained infusion pumps");
  assert.equal(updated[0].verificationStatus, "needs_confirmation");
  assert.equal(updated[0].id, confirmed.id);
  assert.equal(updated[0].source, confirmed.source);
  assert.equal(updated[0].sourceRecordId, confirmed.sourceRecordId);
  assert.equal(updated[1], suggested);
  assert.equal(updated[2], imported);
  assert.equal(confirmed.verificationStatus, "verified");
  assert.equal(confirmed.text, "Maintained patient monitors");

  const draftEdit = updateClaimText(originalClaims, suggested.id, "Suggested new wording");
  assert.deepEqual(draftEdit[1], { ...suggested, text: "Suggested new wording" });
  const importEdit = updateClaimText(originalClaims, imported.id, "Reviewed inspection procedures");
  assert.equal(importEdit[2].verificationStatus, "needs_confirmation");
  console.log("✓ Factual text changes invalidate prior verification and retain lineage");
}

// Whitespace cleanup is not a new factual assertion and should not demote evidence.
{
  const updated = updateClaimText(originalClaims, confirmed.id, `  ${confirmed.text}  `);
  assert.equal(updated[0].verificationStatus, "verified");
  const saved = buildResearchProjectFormValue(undefined, { outcomes: updated });
  assert.deepEqual(saved.outcomes, originalClaims);
  console.log("✓ Whitespace-only edits preserve verification without changing the saved fact");
}

// New user-entered facts are deliberate confirmations, with independent identities.
{
  const newClaim = createUserClaim("  Built a test rig  ", "claim-new", "project-current");
  assert.deepEqual(newClaim, {
    id: "claim-new",
    text: "Built a test rig",
    verificationStatus: "verified",
    source: "user",
    sourceRecordId: "project-current",
  });
  const saved = buildResearchProjectFormValue(
    { verificationStatus: "draft" },
    { outcomes: [newClaim], verificationStatus: "draft" }
  );
  assert.equal(saved.verificationStatus, "draft");
  assert.equal(saved.outcomes[0].verificationStatus, "verified");
  assert.equal(createUserClaim("New responsibility", "another-new-claim").sourceRecordId, undefined);
  console.log("✓ Deliberate user entries are verified independently of their parent");
}

// New records need safe empty relation arrays; editing must retain fields outside the form.
{
  const newExperience = buildExperienceFormValue(undefined, { responsibilities: [] });
  assert.deepEqual(newExperience.skillIds, []);
  assert.deepEqual(newExperience.achievementIds, []);
  const newProject = buildResearchProjectFormValue(undefined, { outcomes: [] });
  assert.deepEqual(newProject.skillIds, []);

  const experienceMetadata: Partial<ExperienceRecord> = {
    id: "experience-current",
    employmentType: "part_time",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-02-01T00:00:00.000Z",
    source: "application",
    skillIds: ["skill-one"],
    achievementIds: ["achievement-one"],
  };
  const experience = buildExperienceFormValue(experienceMetadata, { responsibilities: [confirmed] });
  assert.deepEqual(experience, { ...experienceMetadata, responsibilities: [confirmed] });

  const projectMetadata: Partial<ResearchProjectRecord> = {
    id: "project-current",
    startDate: "2023",
    role: "Researcher",
    createdAt: "2024-01-01T00:00:00.000Z",
    source: "cv_import",
    skillIds: ["skill-two"],
    links: [{ label: "Publication", url: "https://example.com/paper", kind: "publication" }],
  };
  const project = buildResearchProjectFormValue(projectMetadata, { outcomes: [suggested] });
  assert.deepEqual(project, { ...projectMetadata, outcomes: [suggested] });
  console.log("✓ Form values supply relation arrays and preserve existing metadata and links");
}

console.log("✓ All 6 claim editing regression checks passed");
