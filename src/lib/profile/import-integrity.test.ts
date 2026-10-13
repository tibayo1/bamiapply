import assert from "node:assert/strict";
import { detectConflicts, mergeExperienceRecords, prepareImportAdditions, type ImportAdditions } from "./import";
import { getMockCvExtractionFixture, type StagedCvImport } from "./import-fixture";
import { createDemoProfile, ID } from "./mock-profile";
import { profileReducer } from "./reducer";
import type { CareerProfile, SkillRecord } from "@/types/profile";

function append(profile: CareerProfile, additions: ImportAdditions): CareerProfile {
  return {
    ...profile,
    experiences: [...profile.experiences, ...(additions.experiences ?? [])],
    education: [...profile.education, ...(additions.education ?? [])],
    researchProjects: [...profile.researchProjects, ...(additions.researchProjects ?? [])],
    skills: [...profile.skills, ...(additions.skills ?? [])],
    achievements: [...profile.achievements, ...(additions.achievements ?? [])],
  };
}

function emptyProfile(): CareerProfile {
  return { ...createDemoProfile(), experiences: [], education: [], researchProjects: [], skills: [], achievements: [], careerStories: [], workAuthorizations: [] };
}

// The same employer does not mean the same job; dated repeat employment is distinct too.
{
  const profile = createDemoProfile();
  const staged = getMockCvExtractionFixture();
  assert.ok(detectConflicts(profile, staged).some((c) => c.category === "experience"));
  staged.experiences[0].title = "Laboratory Technician";
  assert.equal(detectConflicts(profile, staged).filter((c) => c.category === "experience").length, 0);
  staged.experiences[0].title = "Doctoral Researcher";
  staged.experiences[0].startDate = "2018";
  assert.equal(detectConflicts(profile, staged).filter((c) => c.category === "experience").length, 0);
}

// Education overlap uses institution, equivalent degree and field, rather than institution alone.
{
  const profile = createDemoProfile();
  const staged = getMockCvExtractionFixture();
  const conflicts = detectConflicts(profile, staged).filter((c) => c.category === "education");
  assert.equal(conflicts.length, 2);
  assert.equal(conflicts.find((c) => c.importedRecordId === "imp-edu-phd")?.existingRecordId, ID.eduPhd);
  staged.education[0].fieldOfStudy = "Economics";
  assert.equal(detectConflicts(profile, staged).filter((c) => c.category === "education").length, 1);
}

// Merging never counts as factual confirmation or rewrites the existing record's provenance.
{
  const profile = createDemoProfile();
  const existing = profile.experiences[0];
  const imported = getMockCvExtractionFixture().experiences[0];
  imported.location = "Unconfirmed new location";
  imported.summary = "Unconfirmed new summary";
  imported.responsibilities[0].verificationStatus = "verified";
  imported.responsibilities[1].id = existing.responsibilities[0].id;
  const before = structuredClone(existing);
  const merged = mergeExperienceRecords(existing, imported, "2026-10-12T12:00:00.000Z");
  assert.deepEqual(existing, before, "Merge must not mutate existing profile records");
  assert.equal(merged.verificationStatus, existing.verificationStatus);
  assert.equal(merged.source, existing.source);
  assert.equal(merged.createdAt, existing.createdAt);
  assert.equal(merged.location, existing.location);
  assert.equal(merged.summary, existing.summary);
  assert.deepEqual(merged.skillIds, existing.skillIds);
  assert.deepEqual(merged.responsibilities.slice(0, existing.responsibilities.length), existing.responsibilities);
  const newClaims = merged.responsibilities.slice(existing.responsibilities.length);
  assert.equal(newClaims.length, 2);
  assert.ok(newClaims.every((c) => c.verificationStatus === "needs_confirmation" && c.source === "cv_import"));
  assert.equal(new Set(merged.responsibilities.map((c) => c.id)).size, merged.responsibilities.length);
  assert.equal(mergeExperienceRecords(merged, imported), merged, "An identical repeated merge must be a no-op");
}

// Suggestions retain draft status and provenance; derivation follows a deduplicated claim.
{
  const existing = createDemoProfile().experiences[0];
  const imported = getMockCvExtractionFixture().experiences[0];
  imported.responsibilities = [
    { ...existing.responsibilities[0], id: "extracted-existing-fact" },
    {
      id: "suggested-claim", text: "Suggested wording requiring factual review.",
      source: "suggested", verificationStatus: "draft",
      derivedFromClaimId: "extracted-existing-fact", sourceRecordId: "original-cv-source",
    },
  ];
  const merged = mergeExperienceRecords(existing, imported);
  const suggestion = merged.responsibilities.at(-1)!;
  assert.equal(suggestion.verificationStatus, "draft");
  assert.equal(suggestion.source, "suggested");
  assert.equal(suggestion.sourceRecordId, "original-cv-source");
  assert.equal(suggestion.derivedFromClaimId, existing.responsibilities[0].id);
}

// Repeating an extraction (even with new extraction ids or subsequent confirmation) adds nothing.
{
  const profile = emptyProfile();
  const staged = getMockCvExtractionFixture();
  const before = structuredClone(staged);
  const first = prepareImportAdditions(profile, staged);
  assert.deepEqual(staged, before, "Preparation must not mutate staged extraction records");
  const importedProfile = append(profile, first);
  importedProfile.experiences[0].verificationStatus = "verified";
  importedProfile.experiences[0].responsibilities[0].verificationStatus = "verified";
  assert.deepEqual(prepareImportAdditions(importedProfile, staged), {});
  const freshIds = structuredClone(staged);
  for (const collection of Object.keys(freshIds) as Array<keyof StagedCvImport>) {
    for (const record of freshIds[collection]) record.id = `new-${record.id}`;
  }
  assert.deepEqual(prepareImportAdditions(importedProfile, freshIds), {});
}

// Existing skill identity is reused without changing its source, verification, or evidence links.
{
  const profile = emptyProfile();
  const staged = getMockCvExtractionFixture();
  const existingSkill: SkillRecord = {
    ...staged.skills[0], id: "verified-matlab", name: " matlab ",
    source: "user", verificationStatus: "verified",
  };
  profile.skills = [existingSkill];
  staged.experiences[0].responsibilities[0].verificationStatus = "verified";
  staged.skills[1].evidenceLinks = [{ recordType: "experience", recordId: staged.experiences[0].id, claimId: staged.experiences[0].responsibilities[0].id }];
  const result = prepareImportAdditions(profile, staged);
  assert.equal(result.skills?.length, staged.skills.length - 1);
  assert.deepEqual(result.experiences?.[0].skillIds, ["verified-matlab", "imp-sk-scipy"]);
  assert.equal(result.experiences?.[0].responsibilities[0].verificationStatus, "needs_confirmation");
  assert.deepEqual(profile.skills, [existingSkill]);
  assert.deepEqual(result.skills?.find((s) => s.id === "imp-sk-scipy")?.evidenceLinks, staged.skills[1].evidenceLinks);
}

// Unrelated extraction-id collisions preserve both existing facts and every intra-import pointer.
{
  const profile = createDemoProfile();
  const staged = getMockCvExtractionFixture();
  const experience = staged.experiences[1];
  const claim = experience.responsibilities[0];
  experience.id = profile.experiences[0].id;
  claim.id = profile.experiences[0].responsibilities[0].id;
  claim.sourceRecordId = experience.id;
  staged.skills[0].evidenceLinks = [{ recordType: "experience", recordId: experience.id, claimId: claim.id }];
  staged.achievements[0].linkedRecordType = "experience";
  staged.achievements[0].linkedRecordId = experience.id;
  const result = prepareImportAdditions(profile, { experiences: [experience], skills: staged.skills, achievements: staged.achievements });
  const preparedExperience = result.experiences![0];
  const preparedClaim = preparedExperience.responsibilities[0];
  assert.notEqual(preparedExperience.id, experience.id);
  assert.notEqual(preparedClaim.id, claim.id);
  assert.equal(preparedClaim.sourceRecordId, preparedExperience.id);
  assert.deepEqual(result.skills?.[0].evidenceLinks, [{ recordType: "experience", recordId: preparedExperience.id, claimId: preparedClaim.id }]);
  assert.equal(result.achievements?.[0].linkedRecordId, preparedExperience.id);
  assert.deepEqual(prepareImportAdditions(append(profile, result), { experiences: [experience], skills: staged.skills, achievements: staged.achievements }), {});
}

// Duplicate claims reuse one identity, and unselected records/skills cannot leave dangling references.
{
  const profile = emptyProfile();
  const staged = getMockCvExtractionFixture();
  const experience = staged.experiences[0];
  const claim = experience.responsibilities[0];
  experience.responsibilities.push({ ...claim, id: "duplicate-extracted-claim" });
  staged.skills[1].evidenceLinks = [{ recordType: "experience", recordId: experience.id, claimId: "duplicate-extracted-claim" }];
  const result = prepareImportAdditions(profile, { experiences: [experience], skills: [staged.skills[1]] });
  assert.equal(result.experiences?.[0].responsibilities.length, 2);
  assert.deepEqual(result.experiences?.[0].skillIds, [staged.skills[1].id]);
  assert.equal(result.skills?.[0].evidenceLinks[0].claimId, claim.id);
  assert.deepEqual(prepareImportAdditions(profile, { skills: [staged.skills[1]] }).skills?.[0].evidenceLinks, []);
  assert.deepEqual(
    prepareImportAdditions(append(profile, result), { experiences: [experience], skills: [staged.skills[1]] }),
    {},
    "The same extraction with duplicate claim text must remain idempotent after claims are collapsed"
  );
}

// Repeated education, projects, and achievements are deduplicated within the same batch as well.
{
  const staged = getMockCvExtractionFixture();
  staged.education.push({ ...staged.education[0], id: "same-education-new-id" });
  staged.researchProjects.push(structuredClone({ ...staged.researchProjects[0], id: "same-project-new-id" }));
  staged.achievements.push({ ...staged.achievements[0], id: "same-achievement-new-id" });
  const result = prepareImportAdditions(emptyProfile(), staged);
  assert.equal(result.education?.length, 2);
  assert.equal(result.researchProjects?.length, 1);
  assert.equal(result.achievements?.length, 1);
  assert.ok(result.education?.every((r) => r.verificationStatus === "needs_confirmation"));
}

// Ambiguous extraction ids cannot silently redirect a claim or evidence link to another fact.
{
  const staged = getMockCvExtractionFixture();
  staged.experiences[1].id = staged.experiences[0].id;
  assert.deepEqual(prepareImportAdditions(emptyProfile(), staged), {});
  const duplicateClaimIds = getMockCvExtractionFixture();
  duplicateClaimIds.experiences[1].responsibilities[0].id = duplicateClaimIds.experiences[0].responsibilities[0].id;
  assert.deepEqual(prepareImportAdditions(emptyProfile(), duplicateClaimIds), {});
}

// Current import flow: keep an overlapping role separately, then merge a repeat into the original role.
{
  const profile = createDemoProfile();
  const staged = getMockCvExtractionFixture();
  const imported = staged.experiences[0];
  const kept = profileReducer(profile, {
    type: "APPLY_IMPORT", additions: { experiences: [imported], skills: staged.skills },
  });
  const original = kept.experiences.find((r) => r.id === ID.expDoctoral)!;
  const keepBoth = kept.experiences.find((r) => r.id === imported.id)!;
  assert.ok(keepBoth, "Keep both must persist the extracted role separately");
  const merged = mergeExperienceRecords(original, imported, "2026-10-12T14:00:00.000Z", kept);
  const newClaims = merged.responsibilities.slice(original.responsibilities.length);
  assert.equal(newClaims.length, imported.responsibilities.length);
  assert.ok(newClaims.every((c) => !keepBoth.responsibilities.some((other) => other.id === c.id)));
  assert.ok(newClaims.every((c) => c.verificationStatus === "needs_confirmation"));
  const saved = profileReducer(kept, { type: "UPSERT_RECORD", collection: "experiences", record: merged });
  assert.notEqual(saved, kept, "The global ID guard must accept the repeat import merge");
  const savedOriginal = saved.experiences.find((r) => r.id === original.id)!;
  assert.equal(savedOriginal.responsibilities.length, merged.responsibilities.length);
  assert.deepEqual(saved.experiences.find((r) => r.id === keepBoth.id), keepBoth);
  assert.equal(mergeExperienceRecords(savedOriginal, imported, undefined, saved), savedOriginal);
  const allClaims = [
    ...saved.experiences.flatMap((r) => r.responsibilities),
    ...saved.researchProjects.flatMap((r) => r.outcomes),
  ];
  assert.equal(new Set(allClaims.map((c) => c.id)).size, allClaims.length);
}

// Derivation follows globally reallocated ids, including a collision with a project outcome.
{
  const profile = createDemoProfile();
  const existing = profile.experiences[0];
  const imported = getMockCvExtractionFixture().experiences[0];
  imported.responsibilities[0].id = profile.researchProjects[0].outcomes[0].id;
  imported.responsibilities[1].derivedFromClaimId = imported.responsibilities[0].id;
  const merged = mergeExperienceRecords(existing, imported, undefined, profile);
  const newClaims = merged.responsibilities.slice(existing.responsibilities.length);
  assert.notEqual(newClaims[0].id, imported.responsibilities[0].id);
  assert.equal(newClaims[1].derivedFromClaimId, newClaims[0].id);
}

console.log("✓ All 12 import integrity regression cases passed");
