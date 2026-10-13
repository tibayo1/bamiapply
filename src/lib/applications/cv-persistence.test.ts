import assert from "node:assert/strict";
import { test } from "node:test";
import { hamiltonJob } from "@/lib/analysis/mock-hamilton";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import type { CVSelection } from "@/types/cv";
import { createApplicationRecord, normalizeApplications } from "./domain";
import { createApplicationsStore } from "./provider-state";
import {
  APPLICATIONS_STORAGE_KEY, CURRENT_APPLICATIONS_VERSION, loadApplicationsStorage,
  saveApplicationsToStorage, serializeApplications,
} from "./storage";

function memoryStorage(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  let failWrites = false;
  return {
    getItem(key: string) {
      assert.equal(key, APPLICATIONS_STORAGE_KEY, "CV commands must not touch the Career Profile store");
      return raw;
    },
    setItem(key: string, value: string) {
      assert.equal(key, APPLICATIONS_STORAGE_KEY);
      if (failWrites) throw new Error("Quota exceeded");
      raw = value;
      writes += 1;
    },
    setExternal(value: string | null) { raw = value; },
    set failWrites(value: boolean) { failWrites = value; },
    get raw() { return raw; },
    get writes() { return writes; },
  };
}

function fixture() {
  const profile = createDemoProfile();
  const experience = profile.experiences[0];
  const claim = experience.responsibilities[0];
  const selection: CVSelection = {
    evidence: [{ recordType: "experience", recordId: experience.id, claimId: claim.id }],
    skillIds: [],
  };
  const application = createApplicationRecord({
    id: "app-cv-persistence", job: hamiltonJob, profile,
    now: new Date(Date.now() - 5_000).toISOString(),
  });
  assert.ok(application);
  return { profile, selection, application };
}

function setup(legacy = false) {
  const source = fixture();
  const original = legacy
    ? JSON.stringify({ version: 1, applications: [source.application] })
    : serializeApplications([source.application]);
  const storage = memoryStorage(original);
  let sequence = 0;
  const store = createApplicationsStore({ storage, createCVId: () => `cv-${++sequence}` });
  store.hydrate();
  return { ...source, original, storage, store };
}

test("legacy Application history loads byte-for-byte and upgrades only on a document save", () => {
  const { application, profile, selection, original, storage, store } = setup(true);
  assert.equal(CURRENT_APPLICATIONS_VERSION, 2);
  assert.equal(store.getSnapshot().canPersist, true);
  assert.deepEqual(store.getSnapshot().applications, [application]);
  assert.equal(storage.writes, 0);
  assert.equal(storage.raw, original);
  const saved = store.actions.saveCVVersion(application.id, profile, selection, "reviewed");
  assert.equal(saved.error, null);
  assert.ok(saved.id);
  assert.equal(JSON.parse(storage.raw!).version, 2);
  const persisted = loadApplicationsStorage(storage).applications[0];
  assert.equal(persisted.cvStatus, "Complete");
  assert.equal(persisted.cvVersions?.[0].id, saved.id);
  assert.equal(persisted.status, application.status);
  assert.equal(persisted.fitScore, application.fitScore);
  assert.deepEqual(persisted.snapshots, application.snapshots);
  assert.deepEqual(persisted.statusHistory, application.statusHistory);
});

test("each save appends a frozen version and reload restores all source references", () => {
  const { application, profile, selection, storage, store } = setup();
  const profileBefore = structuredClone(profile);
  assert.equal(store.actions.saveCVVersion(application.id, profile, selection, "draft").error, null);
  const draft = store.getSnapshot().applications[0].cvVersions![0];
  const captured = structuredClone(draft);
  assert.equal(store.getSnapshot().applications[0].cvStatus, "In progress");
  assert.equal(Reflect.set(draft, "status", "reviewed"), false);
  assert.throws(() => draft.selection.evidence.pop(), TypeError);
  assert.equal(store.actions.saveCVVersion(application.id, profile, selection, "reviewed").error, null);
  const record = store.getSnapshot().applications[0];
  assert.equal(record.cvStatus, "Complete");
  assert.equal(record.cvVersions!.length, 2);
  assert.notEqual(record.cvVersions![0].id, record.cvVersions![1].id);
  assert.deepEqual(record.cvVersions![0], captured);
  assert.deepEqual(profile, profileBefore);
  assert.equal(Object.isFrozen(profile), false);
  assert.equal(Object.isFrozen(selection.evidence), false);
  const restored = createApplicationsStore({ storage });
  restored.hydrate();
  assert.deepEqual(restored.getSnapshot().applications, [record]);
});

test("quota failure cannot publish a version, saved ID, or Complete progress", () => {
  const { application, profile, selection, original, storage, store } = setup();
  storage.failWrites = true;
  const failed = store.actions.saveCVVersion(application.id, profile, selection, "reviewed");
  assert.ok(failed.error);
  assert.equal(failed.id, null);
  assert.equal(storage.raw, original);
  assert.equal(storage.writes, 0);
  assert.deepEqual(store.getSnapshot().applications, [application]);
  assert.equal(store.getSnapshot().applications[0].cvStatus, "Not started");
  assert.equal(store.getSnapshot().canPersist, false);
  storage.failWrites = false;
  store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, true);
  assert.equal(store.getSnapshot().applications[0].cvVersions, undefined);
  assert.equal(store.actions.saveCVVersion(application.id, profile, selection, "reviewed").error, null);
});

test("another tab's document history cannot be overwritten by a stale save or retry", () => {
  const { application, profile, selection, storage, store } = setup();
  const other = createApplicationsStore({ storage });
  other.hydrate();
  assert.equal(other.actions.saveCVVersion(application.id, profile, selection, "reviewed").error, null);
  const external = storage.raw;
  const failed = store.actions.saveCVVersion(application.id, profile, selection, "draft");
  assert.equal(failed.id, null);
  assert.match(failed.error ?? "", /another tab/);
  assert.equal(store.getSnapshot().applications[0].cvStatus, "Not started");
  assert.equal(storage.raw, external);
  store.actions.retryPersistence();
  assert.equal(storage.raw, external);
  assert.equal(storage.writes, 1);
});

test("analysis refresh and lifecycle updates retain exact prepared document history", () => {
  const { application, profile, selection, store } = setup();
  assert.equal(store.actions.saveCVVersion(application.id, profile, selection, "reviewed").error, null);
  const versions = structuredClone(store.getSnapshot().applications[0].cvVersions);
  assert.equal(store.actions.changeStatus(application.id, "Applied").error, null);
  profile.experiences[0].responsibilities[0].text = "A revised statement requiring confirmation";
  profile.experiences[0].responsibilities[0].verificationStatus = "needs_confirmation";
  assert.equal(store.actions.refreshAnalysis(application.id, profile).error, null);
  const updated = store.getSnapshot().applications[0];
  assert.equal(updated.status, "Applied");
  assert.equal(updated.cvStatus, "Complete");
  assert.equal(updated.snapshots.length, 2);
  assert.deepEqual(updated.cvVersions, versions);
  assert.ok(normalizeApplications([updated]));
});

test("foreign Profile IDs, unconfirmed records and unconfirmed claims cannot become documents", () => {
  for (const alteration of ["foreign", "record", "claim"] as const) {
    const { application, profile, selection, original, storage, store } = setup();
    if (alteration === "foreign") profile.id = "another-profile";
    if (alteration === "record") profile.experiences[0].verificationStatus = "needs_confirmation";
    if (alteration === "claim") profile.experiences[0].responsibilities[0].verificationStatus = "draft";
    const saved = store.actions.saveCVVersion(application.id, profile, selection, "reviewed");
    assert.equal(saved.id, null);
    assert.ok(saved.error);
    assert.equal(storage.raw, original);
    assert.equal(storage.writes, 0);
    assert.equal(store.getSnapshot().canPersist, true);
    assert.equal(store.getSnapshot().applications[0].cvStatus, "Not started");
  }
});

test("hydration and missing-application boundaries cannot write documents", () => {
  const { application, profile, selection } = fixture();
  const storage = memoryStorage();
  const store = createApplicationsStore({ storage });
  assert.ok(store.actions.saveCVVersion(application.id, profile, selection, "draft").error);
  store.hydrate();
  assert.ok(store.actions.saveCVVersion(application.id, profile, selection, "draft").error);
  assert.equal(storage.raw, null);
  assert.equal(storage.writes, 0);
});

test("CV status requires actual document history and dates stay inside the Application timeline", () => {
  const { application, profile, selection, store } = setup();
  application.cvStatus = "Complete";
  assert.equal(normalizeApplications([application]), null);
  assert.equal(store.actions.saveCVVersion(application.id, profile, selection, "reviewed").error, null);
  const valid = structuredClone(store.getSnapshot().applications[0]);
  for (const mutation of ["status", "early", "late", "duplicate"] as const) {
    const changed = structuredClone(valid);
    if (mutation === "status") changed.cvStatus = "In progress";
    if (mutation === "early") changed.cvVersions![0].createdAt = "2000-01-01T00:00:00.000Z";
    if (mutation === "late") changed.cvVersions![0].createdAt = new Date(Date.parse(changed.updatedAt) + 1).toISOString();
    if (mutation === "duplicate") changed.cvVersions!.push(structuredClone(changed.cvVersions![0]));
    assert.equal(normalizeApplications([changed]), null);
  }
});

test("corrupt documents and legacy envelopes carrying future fields retain every original byte", () => {
  const { application, profile, selection, store } = setup();
  assert.equal(store.actions.saveCVVersion(application.id, profile, selection, "reviewed").error, null);
  const prepared = structuredClone(store.getSnapshot().applications[0]);
  const unconfirmed = structuredClone(prepared);
  unconfirmed.cvVersions![0].sourceProfile.experiences[0].responsibilities[0].verificationStatus = "draft";
  const invented = structuredClone(prepared);
  invented.cvVersions![0].content.personal.name = "An invented candidate";
  const originals = [
    JSON.stringify({ version: 2, applications: [unconfirmed] }),
    JSON.stringify({ version: 2, applications: [invented] }),
    JSON.stringify({ version: 1, applications: [prepared] }),
    JSON.stringify({ version: 1, applications: [application], unknownDocuments: [] }),
  ];
  for (const original of originals) {
    const storage = memoryStorage(original);
    const loaded = loadApplicationsStorage(storage);
    assert.equal(loaded.canPersist, false);
    assert.equal(loaded.raw, original);
    assert.deepEqual(loaded.applications, []);
    assert.equal(saveApplicationsToStorage([], storage).saved, false);
    assert.equal(storage.raw, original);
    assert.equal(storage.writes, 0);
  }
});
