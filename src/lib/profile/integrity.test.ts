import assert from "node:assert/strict";
import { createDemoProfile, ID } from "./mock-profile";
import { profileReducer } from "./reducer";
import { normalizeProfileRecord } from "./validation";
import { getMockCvExtractionFixture } from "./import-fixture";
import { resolveEvidenceLink } from "./evidence";
import { getProfileSignals, getWorkAuthorizationForRegions, workAuthorizationToEligibility } from "./selectors";

const now = "2026-10-12T12:00:00Z";
let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed++;
  console.log(`✓ ${name}`);
}

test("Record confirmation leaves individual imported claims pending", () => {
  const profile = createDemoProfile();
  const original = profile.experiences[0];
  const pending = {
    ...original, verificationStatus: "needs_confirmation" as const,
    responsibilities: original.responsibilities.map((claim) => ({ ...claim, verificationStatus: "needs_confirmation" as const })),
  };
  const initial = profileReducer(profile, { type: "UPSERT_RECORD", collection: "experiences", record: pending }, now);
  // Create a genuinely imported record rather than silently changing existing claim verification.
  const imported = normalizeProfileRecord("experiences", {
    ...pending, id: "pending-import", source: "cv_import",
    responsibilities: [{ id: "pending-import-claim", text: "Delivered a study", source: "cv_import", verificationStatus: "needs_confirmation" }],
  }, now);
  assert.ok(imported);
  const withImport = profileReducer(initial, { type: "UPSERT_RECORD", collection: "experiences", record: imported }, now);
  const confirmed = profileReducer(withImport, { type: "SET_VERIFICATION_STATUS", collection: "experiences", id: imported.id, status: "verified" }, now);
  const link = { recordType: "experience" as const, recordId: imported.id, claimId: "pending-import-claim" };
  assert.equal(resolveEvidenceLink(confirmed, link)?.usable, false);
  const claimConfirmed = profileReducer(confirmed, { type: "SET_VERIFICATION_STATUS", collection: "experiences", id: imported.id, claimId: link.claimId, status: "verified" }, now);
  assert.equal(resolveEvidenceLink(claimConfirmed, link)?.usable, true);
});

test("Ordinary record saves cannot promote draft claims or erase their provenance", () => {
  const profile = createDemoProfile();
  const original = profile.experiences.find((record) => record.id === ID.expMarigold)!;
  const draft = original.responsibilities.find((claim) => claim.verificationStatus === "draft")!;
  assert.ok(draft);
  const updated = profileReducer(profile, {
    type: "UPSERT_RECORD", collection: "experiences",
    record: { ...original, responsibilities: original.responsibilities.map((claim) => ({ ...claim, source: "user", verificationStatus: "verified", derivedFromClaimId: undefined })) },
  }, now);
  const saved = updated.experiences.find((record) => record.id === original.id)!.responsibilities.find((claim) => claim.id === draft.id)!;
  assert.equal(saved.verificationStatus, "draft");
  assert.equal(saved.source, draft.source);
  assert.equal(saved.derivedFromClaimId, draft.derivedFromClaimId);
});

test("Editing verified text invalidates evidence until explicit confirmation", () => {
  const profile = createDemoProfile();
  const original = profile.experiences[0];
  const claim = original.responsibilities.find((item) => item.verificationStatus === "verified")!;
  const updated = profileReducer(profile, {
    type: "UPSERT_RECORD", collection: "experiences",
    record: { ...original, responsibilities: original.responsibilities.map((item) => item.id === claim.id ? { ...item, text: "Changed factual statement" } : item) },
  }, now);
  const evidence = resolveEvidenceLink(updated, { recordType: "experience", recordId: original.id, claimId: claim.id });
  assert.equal(evidence?.excerpt, "Changed factual statement");
  assert.equal(evidence?.status, "needs_confirmation");
  assert.equal(evidence?.usable, false);
});

test("Changing the employer invalidates the context of existing evidence", () => {
  const profile = createDemoProfile();
  const original = profile.experiences[0];
  const updated = profileReducer(profile, { type: "UPSERT_RECORD", collection: "experiences", record: { ...original, organization: "A different employer" } }, now);
  const claim = original.responsibilities.find((item) => item.verificationStatus === "verified")!;
  assert.equal(resolveEvidenceLink(updated, { recordType: "experience", recordId: original.id, claimId: claim.id })?.usable, false);
  assert.equal(updated.experiences[0].createdAt, original.createdAt);
});

test("New form records stay safe through persistence and deletion cleanup", () => {
  const record = normalizeProfileRecord("experiences", { id: "new-user-role", title: "Researcher", organization: "Example Lab", responsibilities: [] }, now);
  assert.ok(record);
  const profile = profileReducer(createDemoProfile(), { type: "UPSERT_RECORD", collection: "experiences", record }, now);
  const saved = profile.experiences.find((item) => item.id === record.id)!;
  assert.deepEqual(saved.skillIds, []);
  assert.deepEqual(saved.achievementIds, []);
  assert.doesNotThrow(() => getProfileSignals(profile));
  assert.doesNotThrow(() => profileReducer(profile, { type: "REMOVE_RECORD", collection: "skills", id: profile.skills[0].id }, now));
});

test("Repeated imports preserve unique records and all prior verified facts", () => {
  const profile = createDemoProfile();
  const once = profileReducer(profile, { type: "APPLY_IMPORT", additions: getMockCvExtractionFixture() }, now);
  const twice = profileReducer(once, { type: "APPLY_IMPORT", additions: getMockCvExtractionFixture() }, now);
  assert.deepEqual(twice, once);
  for (const collection of ["experiences", "education", "researchProjects", "skills", "achievements"] as const) {
    assert.equal(new Set(twice[collection].map((record) => record.id)).size, twice[collection].length);
  }
  for (const original of profile.experiences) {
    assert.deepEqual(twice.experiences.find((record) => record.id === original.id), original);
  }
});

test("Cross-collection ID collisions and malformed profile replacements are rejected", () => {
  const profile = createDemoProfile();
  const duplicate = { ...profile.skills[0], id: profile.experiences[0].id };
  assert.strictEqual(profileReducer(profile, { type: "UPSERT_RECORD", collection: "skills", record: duplicate }, now), profile);
  const malformed = { ...profile, experiences: null } as unknown as typeof profile;
  assert.strictEqual(profileReducer(profile, { type: "REPLACE_PROFILE", profile: malformed }, now), profile);
});

test("Deleting evidence removes achievement associations as well as evidence links", () => {
  const profile = createDemoProfile();
  const achievement = normalizeProfileRecord("achievements", {
    id: "linked-achievement", title: "Research delivery", description: "Completed the study",
    linkedRecordType: "experience", linkedRecordId: ID.expDoctoral,
  }, now);
  assert.ok(achievement);
  const linked = profileReducer(profile, { type: "UPSERT_RECORD", collection: "achievements", record: achievement }, now);
  const removed = profileReducer(linked, { type: "REMOVE_RECORD", collection: "experiences", id: ID.expDoctoral }, now);
  const saved = removed.achievements.find((record) => record.id === achievement.id)!;
  assert.equal(saved.linkedRecordId, undefined);
  assert.equal(saved.linkedRecordType, undefined);
});

test("Current verified authorization is selected ahead of expired or unverified entries", () => {
  const profile = createDemoProfile();
  const base = profile.workAuthorizations[0];
  profile.workAuthorizations = [
    { ...base, id: "expired", countryOrRegion: "Switzerland", status: "authorized", verificationStatus: "verified", expiresAt: "2020-01-01" },
    { ...base, id: "unconfirmed", countryOrRegion: "Switzerland", status: "authorized", verificationStatus: "needs_confirmation", expiresAt: undefined },
    { ...base, id: "current", countryOrRegion: "Switzerland", status: "authorized", verificationStatus: "verified", expiresAt: undefined },
  ];
  const selected = getWorkAuthorizationForRegions(profile, ["Switzerland"], new Date(now));
  assert.equal(selected?.id, "current");
  assert.equal(workAuthorizationToEligibility(selected, { now: new Date(now) }), "satisfied");
  assert.equal(workAuthorizationToEligibility({ ...base, status: "authorized", verificationStatus: "verified", expiresAt: "invalid" }, { now: new Date(now) }), "needs_confirmation");
});

test("Verified children of an unconfirmed record are not advertised as usable evidence", () => {
  const profile = createDemoProfile();
  const original = profile.experiences[0];
  const unconfirmed = profileReducer(profile, { type: "SET_VERIFICATION_STATUS", collection: "experiences", id: original.id, status: "needs_confirmation" }, now);
  const verifiedClaims = original.responsibilities.filter((claim) => claim.verificationStatus === "verified").length;
  assert.equal(getProfileSignals(unconfirmed).verifiedItems, getProfileSignals(profile).verifiedItems - verifiedClaims - 1);
});

console.log(`All ${passed} Profile integrity cases passed.`);
