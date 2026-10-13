import assert from "node:assert/strict";
import { createDemoProfile } from "./mock-profile";
import {
  CURRENT_PROFILE_VERSION,
  PROFILE_STORAGE_KEY,
  loadProfileStorage,
  saveProfileToStorage,
  serializeProfile,
} from "./storage";
import { createRecoveryProfile, normalizeCareerProfile, normalizeProfileRecord } from "./validation";

const NOW = "2026-10-12T12:00:00.000Z";
let passed = 0;

function check(label: string, run: () => void) {
  run();
  passed += 1;
  console.log(`✓ ${label}`);
}

function memoryStorage(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  return {
    getItem(key: string) {
      assert.equal(key, PROFILE_STORAGE_KEY);
      return raw;
    },
    setItem(key: string, value: string) {
      assert.equal(key, PROFILE_STORAGE_KEY);
      raw = value;
      writes += 1;
    },
    removeItem() { raw = null; },
    get raw() { return raw; },
    get writes() { return writes; },
  };
}

console.log("── Running Career Profile Validation & Storage Tests ──");

check("Corrupt JSON is retained and cannot be overwritten by an autosave", () => {
  const original = '{"version":1,"profile":';
  const storage = memoryStorage(original);
  const result = loadProfileStorage(storage);
  assert.equal(result.canPersist, false);
  assert.ok(result.issue);
  assert.equal(result.raw, original);
  assert.deepEqual(result.profile.experiences, []);
  assert.equal(result.profile.personal.verificationStatus, "draft");
  assert.equal(saveProfileToStorage(createDemoProfile(), storage).saved, false);
  assert.equal(storage.raw, original);
  assert.equal(storage.writes, 0);
});

check("Unsupported versions preserve the complete original payload", () => {
  const original = JSON.stringify({ version: CURRENT_PROFILE_VERSION + 1, profile: createDemoProfile(), futureField: "keep" });
  const storage = memoryStorage(original);
  const result = loadProfileStorage(storage);
  assert.equal(result.canPersist, false);
  assert.match(result.issue ?? "", /unsupported version/);
  assert.equal(result.raw, original);
  assert.equal(saveProfileToStorage(createDemoProfile(), storage).saved, false);
  assert.equal(storage.raw, original);
});

check("An empty saved string is corruption, distinct from absent storage", () => {
  const empty = memoryStorage("");
  assert.equal(loadProfileStorage(empty).canPersist, false);
  assert.equal(saveProfileToStorage(createDemoProfile(), empty).saved, false);
  assert.equal(empty.raw, "");
  const absent = memoryStorage();
  assert.equal(loadProfileStorage(absent).canPersist, true);
  assert.equal(saveProfileToStorage(createDemoProfile(), absent).saved, true);
});

check("Supported v1 repair fills missing arrays without inventing facts", () => {
  const source = createDemoProfile();
  const originalText = source.experiences[0].responsibilities[0].text;
  const partial = JSON.parse(JSON.stringify(source));
  delete partial.experiences[0].achievementIds;
  delete partial.experiences[0].skillIds;
  delete partial.experiences[1].responsibilities;
  delete partial.researchProjects[0].technologies;
  delete partial.skills[0].evidenceLinks;
  delete partial.careerStories[0].actions;
  const storage = memoryStorage(JSON.stringify({ version: 1, profile: partial }));
  const result = loadProfileStorage(storage);
  assert.equal(result.canPersist, true);
  assert.equal(result.issue, null);
  assert.deepEqual(result.profile.experiences[0].achievementIds, []);
  assert.deepEqual(result.profile.experiences[0].skillIds, []);
  assert.deepEqual(result.profile.experiences[1].responsibilities, []);
  assert.deepEqual(result.profile.skills[0].evidenceLinks, []);
  assert.deepEqual(result.profile.researchProjects[0].technologies, []);
  assert.deepEqual(result.profile.careerStories[0].actions, []);
  assert.equal(result.profile.experiences[0].responsibilities[0].text, originalText);
  assert.equal(storage.writes, 0, "Loading never changes the original raw data");
  assert.equal(saveProfileToStorage(result.profile, storage).saved, true);
  assert.equal(JSON.parse(storage.raw!).version, 1);
});

check("Malformed records and provenance fail validation instead of becoming verified", () => {
  const source = createDemoProfile();
  const corruptions: Array<(value: ReturnType<typeof createDemoProfile>) => void> = [
    (value) => { Object.assign(value.experiences[0], { title: 42 }); },
    (value) => { Object.assign(value.skills[0], { category: "made_up" }); },
    (value) => { Object.assign(value.personal, { verificationStatus: "auto_verified" }); },
    (value) => { Reflect.deleteProperty(value.experiences[0], "source"); },
    (value) => { Reflect.deleteProperty(value.experiences[0].responsibilities[0], "verificationStatus"); },
    (value) => { Object.assign(value.researchProjects[0], { methods: "a string" }); },
    (value) => { Object.assign(value.preferences, { workStyles: ["anywhere"] }); },
    (value) => { Object.assign(value.workAuthorizations[0], { expiresAt: "not-a-date" }); },
  ];
  for (const corrupt of corruptions) {
    const profile = structuredClone(source);
    corrupt(profile);
    assert.equal(normalizeCareerProfile(profile), null);
    const storage = memoryStorage(serializeProfile(profile));
    const original = storage.raw;
    assert.equal(loadProfileStorage(storage).canPersist, false);
    assert.equal(saveProfileToStorage(source, storage).saved, false);
    assert.equal(storage.raw, original);
  }
});

check("Duplicate record and claim IDs cannot create ambiguous evidence", () => {
  const duplicateRecord = createDemoProfile();
  duplicateRecord.skills[0].id = duplicateRecord.experiences[0].id;
  assert.equal(normalizeCareerProfile(duplicateRecord), null);
  const duplicateClaim = createDemoProfile();
  duplicateClaim.researchProjects[0].outcomes[0].id = duplicateClaim.experiences[0].responsibilities[0].id;
  assert.equal(normalizeCareerProfile(duplicateClaim), null);
  assert.equal(normalizeProfileRecord("experiences", {
    id: "e", title: "Engineer", organization: "Hospital",
    responsibilities: [
      { id: "same", text: "First", source: "user", verificationStatus: "verified" },
      { id: "same", text: "Second", source: "user", verificationStatus: "verified" },
    ],
  }, NOW), null);
});

check("Evidence links and provenance IDs require valid types and nonempty identifiers", () => {
  const input = { id: "s", name: "Testing", category: "technical" };
  for (const invalid of [
    { recordType: "skill", recordId: "e" },
    { recordType: "experience", recordId: "" },
    { recordType: "experience", recordId: "e", claimId: 42 },
  ]) {
    assert.equal(normalizeProfileRecord("skills", { ...input, evidenceLinks: [invalid] }, NOW), null);
  }
  const link = { recordType: "experience", recordId: "e", claimId: "c" };
  assert.equal(normalizeProfileRecord("skills", { ...input, evidenceLinks: [link, link] }, NOW), null);
  assert.equal(normalizeProfileRecord("experiences", {
    id: "e", title: "Engineer", organization: "Hospital",
    responsibilities: [{ id: "c", text: "A fact", sourceRecordId: "" }],
  }, NOW), null);
});

check("New records have complete arrays and metadata after normalization", () => {
  const experience = normalizeProfileRecord("experiences", { id: "e", title: "Engineer", organization: "Hospital" }, NOW);
  assert.ok(experience);
  assert.equal(experience.source, "user");
  assert.equal(experience.verificationStatus, "verified");
  assert.equal(experience.createdAt, NOW);
  assert.deepEqual([experience.responsibilities, experience.achievementIds, experience.skillIds], [[], [], []]);
  const project = normalizeProfileRecord("researchProjects", { id: "p", title: "Study", projectType: "research" }, NOW);
  assert.ok(project);
  assert.deepEqual([project.methods, project.technologies, project.outcomes, project.skillIds], [[], [], [], []]);
  const story = normalizeProfileRecord("careerStories", { id: "story", title: "A challenge" }, NOW);
  assert.ok(story);
  assert.deepEqual([story.actions, story.demonstrates, story.usefulFor, story.skillIds, story.evidenceLinks], [[], [], [], [], []]);
  const skill = normalizeProfileRecord("skills", { id: "s", name: "Testing", category: "technical" }, NOW);
  assert.ok(skill);
  assert.deepEqual(skill.evidenceLinks, []);
});

check("Missing verification on imported or suggested content never becomes verified", () => {
  const imported = normalizeProfileRecord("experiences", {
    id: "imported", title: "Engineer", organization: "Hospital", source: "cv_import",
    responsibilities: [{ id: "c", text: "Extracted claim" }],
  }, NOW);
  assert.ok(imported);
  assert.equal(imported.verificationStatus, "needs_confirmation");
  assert.equal(imported.responsibilities[0].source, "cv_import");
  assert.equal(imported.responsibilities[0].verificationStatus, "needs_confirmation");
  const suggested = normalizeProfileRecord("experiences", {
    id: "suggested", title: "Engineer", organization: "Hospital", source: "suggested",
    responsibilities: [{ id: "draft", text: "Suggested rewording" }],
  }, NOW);
  assert.ok(suggested);
  assert.equal(suggested.verificationStatus, "draft");
  assert.equal(suggested.responsibilities[0].verificationStatus, "draft");
  const enteredClaim = normalizeProfileRecord("experiences", {
    id: "entered", title: "Engineer", organization: "Hospital",
    responsibilities: [{ id: "not-confirmed", text: "An unconfirmed statement", source: "user" }],
  }, NOW);
  assert.equal(enteredClaim?.responsibilities[0].verificationStatus, "needs_confirmation");
});

check("Metrics, context and original claim text survive normalization and storage verbatim", () => {
  const metric = { value: " 120 participants across 6 protocols ", context: "Controlled study\ncohort α" };
  const achievement = normalizeProfileRecord("achievements", { id: "a", title: "Study", description: "Execution", metric }, NOW);
  assert.ok(achievement);
  assert.deepEqual(achievement.metric, metric);
  const profile = createDemoProfile();
  profile.achievements.push(achievement);
  const text = "  Conducted testing\nwith the clinical team.  ";
  profile.experiences[0].responsibilities[0].text = text;
  const storage = memoryStorage();
  assert.equal(saveProfileToStorage(profile, storage).saved, true);
  const result = loadProfileStorage(storage);
  assert.deepEqual(result.profile.achievements[0].metric, metric);
  assert.equal(result.profile.experiences[0].responsibilities[0].text, text);
});

check("Blocked reads and writes report a recovery issue and preserve stored data", () => {
  const original = serializeProfile(createDemoProfile());
  const blockedRead = {
    getItem(): string | null { throw new Error("Denied"); },
    setItem() { throw new Error("Should not write"); },
    removeItem() {},
  };
  const readResult = loadProfileStorage(blockedRead);
  assert.equal(readResult.canPersist, false);
  assert.ok(readResult.issue);
  assert.deepEqual(readResult.profile.skills, []);
  assert.equal(saveProfileToStorage(createDemoProfile(), blockedRead).saved, false);
  let raw = original;
  const blockedWrite = {
    getItem() { return raw; },
    setItem() { throw new Error("Quota exceeded"); },
    removeItem() { raw = ""; },
  };
  const result = saveProfileToStorage(createDemoProfile(), blockedWrite);
  assert.equal(result.saved, false);
  assert.match(result.issue ?? "", /could not be saved/);
  assert.equal(raw, original);
});

check("Invalid outgoing profiles cannot replace a valid saved profile", () => {
  const storage = memoryStorage(serializeProfile(createDemoProfile()));
  const original = storage.raw;
  const invalid = createDemoProfile();
  Object.assign(invalid.experiences[0], { responsibilities: null });
  assert.equal(saveProfileToStorage(invalid, storage).saved, false);
  assert.equal(storage.raw, original);
  assert.equal(storage.writes, 0);
  assert.ok(normalizeCareerProfile(createRecoveryProfile(NOW)));
});

check("A stale writer and its retries cannot overwrite another tab's valid profile", () => {
  const storage = memoryStorage(serializeProfile(createDemoProfile()));
  const writerA = loadProfileStorage(storage);
  const writerB = loadProfileStorage(storage);
  const checkpointA = writerA.raw;
  const checkpointB = writerB.raw;
  writerA.profile.personal.headline = "Unsaved edits in tab A";
  writerB.profile.personal.headline = "New saved facts from tab B";
  const savedB = saveProfileToStorage(writerB.profile, storage, checkpointB);
  assert.equal(savedB.saved, true);
  assert.equal(savedB.raw, storage.raw, "A successful writer receives its exact next checkpoint");
  const externalBytes = storage.raw;
  const writesBeforeConflict = storage.writes;
  const autoSaveA = saveProfileToStorage(writerA.profile, storage, checkpointA);
  assert.equal(autoSaveA.saved, false);
  assert.match(autoSaveA.issue ?? "", /changed since this tab loaded/);
  assert.equal(autoSaveA.raw, externalBytes, "The other version can be preserved as a backup");
  assert.equal(storage.raw, externalBytes);
  assert.equal(storage.writes, writesBeforeConflict);
  // Retry may establish that storage works, but must retain A's last checkpoint.
  assert.equal(loadProfileStorage(storage).canPersist, true);
  const retryA = saveProfileToStorage(writerA.profile, storage, checkpointA);
  assert.equal(retryA.saved, false);
  assert.equal(storage.raw, externalBytes);
  assert.equal(loadProfileStorage(storage).profile.personal.headline, "New saved facts from tab B");
  assert.equal(writerA.profile.personal.headline, "Unsaved edits in tab A", "Current edits remain available to export");
  writerB.profile.personal.location = "Updated again in tab B";
  assert.equal(saveProfileToStorage(writerB.profile, storage, savedB.raw).saved, true,
    "The up-to-date tab advances using its successful save checkpoint");
});

check("An absent-storage checkpoint cannot overwrite a profile created by another tab", () => {
  const storage = memoryStorage();
  const initial = loadProfileStorage(storage);
  assert.equal(initial.raw, null);
  const external = createDemoProfile();
  external.personal.headline = "Profile first saved elsewhere";
  assert.equal(saveProfileToStorage(external, storage, null).saved, true);
  const externalBytes = storage.raw;
  assert.equal(saveProfileToStorage(initial.profile, storage, initial.raw).saved, false);
  assert.equal(storage.raw, externalBytes);
});

console.log(`\nAll ${passed} validation and storage cases passed.`);
