import assert from "node:assert/strict";
import { hamiltonJob } from "@/lib/analysis/mock-hamilton";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { createApplicationsStore } from "./provider-state";
import { APPLICATIONS_STORAGE_KEY, serializeApplications } from "./storage";

let passed = 0;
function check(label: string, run: () => void) {
  run();
  passed += 1;
  console.log(`✓ ${label}`);
}

function memoryStorage(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  let failWrites = false;
  let failReads = false;
  return {
    getItem(key: string) {
      assert.equal(key, APPLICATIONS_STORAGE_KEY, "Applications commands must never access the Profile key");
      if (failReads) throw new Error("Blocked");
      return raw;
    },
    setItem(key: string, value: string) {
      assert.equal(key, APPLICATIONS_STORAGE_KEY);
      if (failWrites) throw new Error("Quota");
      raw = value;
      writes += 1;
    },
    setExternal(value: string | null) { raw = value; },
    set failWrites(value: boolean) { failWrites = value; },
    set failReads(value: boolean) { failReads = value; },
    get raw() { return raw; },
    get writes() { return writes; },
  };
}

function setup(initial: string | null = null) {
  const storage = memoryStorage(initial);
  let sequence = 0;
  const store = createApplicationsStore({ storage, createId: () => `app-${++sequence}` });
  return { store, storage, profile: createDemoProfile() };
}

console.log("── Running Applications Provider Commands Tests ──");

check("Hydration gates commands and never writes demo rows", () => {
  const { store, storage, profile } = setup();
  assert.equal(store.getSnapshot().isHydrated, false);
  assert.deepEqual(store.getServerSnapshot().applications, []);
  assert.ok(store.actions.saveApplication(hamiltonJob, profile).error);
  assert.equal(storage.writes, 0);
  store.hydrate();
  assert.equal(store.getSnapshot().isHydrated, true);
  assert.equal(store.getSnapshot().canPersist, true);
  assert.deepEqual(store.getSnapshot().applications, []);
  assert.equal(storage.writes, 0);
});

check("Save is durable before returning an ID and reload restores the same record", () => {
  const { store, storage, profile } = setup();
  store.hydrate();
  const result = store.actions.saveApplication(hamiltonJob, profile);
  assert.equal(result.error, null);
  assert.ok(result.id);
  assert.equal(JSON.parse(storage.raw!).applications[0].id, result.id);
  const fresh = createApplicationsStore({ storage });
  fresh.hydrate();
  assert.deepEqual(fresh.getSnapshot().applications, store.getSnapshot().applications);
});

check("Published records and their history cannot be changed through exposed references", () => {
  const { store, storage, profile } = setup();
  const serverState = store.getServerSnapshot();
  assert.equal(Reflect.set(serverState, "isHydrated", true), false);
  assert.throws(() => serverState.applications.push({} as never), TypeError);
  store.hydrate();
  assert.equal(Reflect.set(store.getSnapshot(), "canPersist", false), false);

  const saved = store.actions.saveApplication(hamiltonJob, profile);
  assert.ok(saved.id);
  const state = store.getSnapshot();
  const record = store.actions.getApplicationForJob(hamiltonJob.id, profile.id);
  assert.ok(record);
  const original = structuredClone(record);
  const raw = storage.raw;
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });

  assert.equal(Reflect.set(record, "status", "Offer"), false);
  assert.equal(Reflect.set(record.snapshots[0].analysis, "overallFit", 100), false);
  assert.equal(Reflect.set(record.snapshots[0].evidence[0].link, "recordId", "invented-record"), false);
  assert.equal(Reflect.set(record.statusHistory[0], "status", "Applied"), false);
  assert.throws(() => state.applications.pop(), TypeError);
  assert.throws(() => record.snapshots.splice(0, 1), TypeError);
  assert.deepEqual(record, original);
  assert.equal(storage.raw, raw);
  assert.equal(notifications, 0);
  assert.equal(store.getSnapshot(), state);

  // The store freezes its own snapshots, never the caller's Profile or job.
  assert.equal(Reflect.set(profile.personal, "name", "Updated source profile"), true);
  assert.equal(Object.isFrozen(hamiltonJob.requirements), false);
  assert.equal(store.actions.changeStatus(saved.id, "Preparing").error, null);
  assert.equal(notifications, 1);
  assert.notEqual(store.getSnapshot(), state);
  assert.deepEqual(record, original);
  assert.equal(store.getSnapshot().applications[0].status, "Preparing");
  assert.equal(Reflect.set(store.getSnapshot().applications[0], "status", "Offer"), false);
  unsubscribe();

  const restored = createApplicationsStore({ storage });
  restored.hydrate();
  const restoredRecord = restored.getSnapshot().applications[0];
  assert.equal(Reflect.set(restoredRecord.snapshots[0].evidence[0], "excerpt", "Invented experience"), false);
  assert.deepEqual(restoredRecord, store.getSnapshot().applications[0]);
});

check("Saving derives its snapshot from source inputs and ignores extra UI state", () => {
  const { store, profile } = setup();
  store.hydrate();
  const originalProfile = structuredClone(profile);
  const originalJob = structuredClone(hamiltonJob);
  const uiOptions = {
    status: "Saved" as const,
    id: "ui-id",
    job: { ...hamiltonJob, company: "Invented company" },
    profile: { ...profile, id: "another-profile" },
    analysis: { overallFit: 100 },
    overrides: { "req-clinical-trial": { confirmed: true, note: "Unverified what-if" } },
  };
  const saved = store.actions.saveApplication(hamiltonJob, profile, uiOptions);
  assert.equal(saved.error, null);
  assert.notEqual(saved.id, uiOptions.id);
  const record = store.getSnapshot().applications[0];
  assert.equal(record.profileId, profile.id);
  assert.equal(record.job.company, hamiltonJob.company);
  assert.equal(record.fitScore, buildJobAnalysis({ profile, job: hamiltonJob }).overallFit);
  assert.equal(JSON.stringify(record).includes("Unverified what-if"), false);
  assert.deepEqual(profile, originalProfile);
  assert.deepEqual(hamiltonJob, originalJob);
});

check("Rapid commands share the latest successful state without losing records", () => {
  const { store, profile } = setup();
  store.hydrate();
  const first = store.actions.saveApplication(hamiltonJob, profile);
  const second = store.actions.saveApplication({ ...hamiltonJob, id: "another-job", company: "Another company" }, profile);
  assert.equal(first.error, null);
  assert.equal(second.error, null);
  assert.notEqual(first.id, second.id);
  assert.equal(store.getSnapshot().applications.length, 2);
  assert.equal(store.actions.getApplicationForJob(hamiltonJob.id, profile.id)?.id, first.id);
});

check("Duplicate saves keep the original snapshot, even after Profile changes", () => {
  const { store, storage, profile } = setup();
  store.hydrate();
  const first = store.actions.saveApplication(hamiltonJob, profile);
  const original = structuredClone(store.getSnapshot().applications[0]);
  profile.experiences[0].responsibilities[0].verificationStatus = "needs_confirmation";
  const duplicate = store.actions.saveApplication(hamiltonJob, profile);
  assert.equal(duplicate.id, first.id);
  assert.equal(duplicate.error, null);
  assert.deepEqual(store.getSnapshot().applications[0], original);
  assert.equal(storage.writes, 1);
});

check("Build can resume Saved or Skipped records while preserving snapshots", () => {
  for (const initialStatus of ["Saved", "Skipped"] as const) {
    const { store, profile } = setup();
    store.hydrate();
    const saved = store.actions.saveApplication(hamiltonJob, profile, { status: initialStatus, reason: "Prefer another location" });
    const original = structuredClone(store.getSnapshot().applications[0].snapshots);
    const built = store.actions.saveApplication(hamiltonJob, profile, { status: "Preparing" });
    assert.equal(built.id, saved.id);
    assert.equal(store.getSnapshot().applications.length, 1);
    assert.equal(store.getSnapshot().applications[0].status, "Preparing");
    assert.deepEqual(store.getSnapshot().applications[0].snapshots, original);
  }
});

check("Repeated save, build and skip commands never downgrade an advanced lifecycle", () => {
  const { store, profile } = setup();
  store.hydrate();
  const saved = store.actions.saveApplication(hamiltonJob, profile);
  assert.ok(saved.id);
  assert.equal(store.actions.changeStatus(saved.id, "Applied").error, null);
  const applied = structuredClone(store.getSnapshot().applications[0]);
  for (const status of ["Saved", "Preparing", "Skipped"] as const) {
    assert.equal(store.actions.saveApplication(hamiltonJob, profile, { status }).error, null);
    assert.deepEqual(store.getSnapshot().applications[0], applied);
  }
});

check("Explicit status changes preserve analysis and retain lifecycle history", () => {
  const { store, profile } = setup();
  store.hydrate();
  const saved = store.actions.saveApplication(hamiltonJob, profile);
  assert.ok(saved.id);
  const original = structuredClone(store.getSnapshot().applications[0].snapshots);
  assert.equal(store.actions.changeStatus(saved.id, "Skipped", "Salary range").error, null);
  const record = store.getSnapshot().applications[0];
  assert.equal(record.status, "Skipped");
  assert.equal(record.skipReason, "Salary range");
  assert.equal(record.statusHistory.at(-1)?.reason, "Salary range");
  assert.deepEqual(record.snapshots, original);
  assert.ok(store.actions.changeStatus("missing-id", "Applied").error);
});

check("Analysis refresh appends history and does not mutate Profile data", () => {
  const { store, profile } = setup();
  store.hydrate();
  const saved = store.actions.saveApplication(hamiltonJob, profile);
  assert.ok(saved.id);
  const snapshot = structuredClone(store.getSnapshot().applications[0].snapshots[0]);
  profile.experiences[0].responsibilities[0].verificationStatus = "needs_confirmation";
  const profileBefore = structuredClone(profile);
  assert.equal(store.actions.refreshAnalysis(saved.id, profile).error, null);
  const record = store.getSnapshot().applications[0];
  assert.equal(record.snapshots.length, 2);
  assert.deepEqual(record.snapshots[0], snapshot);
  assert.notEqual(record.snapshots[0].profileRevision, record.snapshots[1].profileRevision);
  assert.deepEqual(profile, profileBefore);
  const wrongProfile = { ...profile, id: "different-profile" };
  assert.ok(store.actions.refreshAnalysis(saved.id, wrongProfile).error);
  assert.equal(store.getSnapshot().applications[0].snapshots.length, 2);
});

check("Quota failure returns no ID and cannot create a fake saved application", () => {
  const { store, storage, profile } = setup();
  store.hydrate();
  storage.failWrites = true;
  const failed = store.actions.saveApplication(hamiltonJob, profile);
  assert.equal(failed.id, null);
  assert.ok(failed.error);
  assert.deepEqual(store.getSnapshot().applications, []);
  assert.equal(store.getSnapshot().canPersist, false);
  assert.equal(storage.raw, null);
  storage.failWrites = false;
  store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, true);
  assert.equal(store.actions.saveApplication(hamiltonJob, profile).error, null);
});

check("Corruption is retained for recovery and cannot be bypassed by retry", () => {
  const corrupt = '{"version":1,"applications":';
  const { store, storage, profile } = setup(corrupt);
  store.hydrate();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.equal(store.actions.getApplicationsRecoveryData(), corrupt);
  assert.deepEqual(JSON.parse(store.actions.getApplicationsExportData()).applications, []);
  assert.ok(store.actions.saveApplication(hamiltonJob, profile).error);
  store.actions.retryPersistence();
  assert.equal(storage.raw, corrupt);
  assert.equal(storage.writes, 0);
});

check("Cross-tab events pause saving and preserve both export versions", () => {
  const { store: storeA, storage, profile } = setup();
  storeA.hydrate();
  const storeB = createApplicationsStore({ storage, createId: () => "app-b" });
  storeB.hydrate();
  assert.equal(storeB.actions.saveApplication(hamiltonJob, profile).error, null);
  const external = storage.raw;
  storeA.observeExternalChanges();
  assert.equal(storeA.getSnapshot().canPersist, false);
  assert.deepEqual(storeA.getSnapshot().applications, []);
  assert.equal(storeA.actions.getApplicationsRecoveryData(), external);
  assert.deepEqual(JSON.parse(storeA.actions.getApplicationsExportData()).applications, []);
  storeA.actions.retryPersistence();
  assert.equal(storeA.getSnapshot().canPersist, false);
  assert.equal(storage.raw, external);
});

check("Commands detect a missed cross-tab event, including duplicate no-op saves", () => {
  const { store, storage, profile } = setup();
  store.hydrate();
  const saved = store.actions.saveApplication(hamiltonJob, profile);
  assert.ok(saved.id);
  const original = structuredClone(store.getSnapshot().applications);
  const external = serializeApplications([]);
  storage.setExternal(external);
  const duplicate = store.actions.saveApplication(hamiltonJob, profile);
  assert.equal(duplicate.id, null);
  assert.ok(duplicate.error);
  assert.equal(storage.raw, external);
  assert.deepEqual(store.getSnapshot().applications, original);
  store.actions.retryPersistence();
  assert.equal(storage.raw, external);
  assert.deepEqual(store.getSnapshot().applications, original);
});

check("Readability restoration cannot silently replace recovered external data", () => {
  const { store, storage } = setup();
  storage.failReads = true;
  store.hydrate();
  assert.equal(store.getSnapshot().canPersist, false);
  storage.failReads = false;
  const external = serializeApplications([]);
  storage.setExternal(external);
  store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.match(store.getSnapshot().persistenceIssue ?? "", /reload/);
  assert.equal(storage.raw, external);
  assert.equal(storage.writes, 0);
});

check("Repeated hydration and provider subscriptions do not replace state", () => {
  const { store, profile } = setup();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  store.hydrate();
  const saved = store.actions.saveApplication(hamiltonJob, profile);
  assert.ok(saved.id);
  store.hydrate();
  assert.equal(notifications, 2);
  unsubscribe();
  assert.equal(store.actions.changeStatus(saved.id, "Preparing").error, null);
  assert.equal(notifications, 2);
  assert.equal(store.getServerSnapshot().isHydrated, false);
});

console.log(`\nAll ${passed} Applications provider command cases passed.`);
