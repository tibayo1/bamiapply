import assert from "node:assert/strict";
import { hamiltonJob } from "@/lib/analysis/mock-hamilton";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { createApplicationRecord } from "./domain";
import {
  APPLICATIONS_STORAGE_KEY,
  CURRENT_APPLICATIONS_VERSION,
  loadApplicationsStorage,
  saveApplicationsToStorage,
  serializeApplications,
} from "./storage";

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
    getItem(key: string) { assert.equal(key, APPLICATIONS_STORAGE_KEY); return raw; },
    setItem(key: string, value: string) { assert.equal(key, APPLICATIONS_STORAGE_KEY); raw = value; writes += 1; },
    setExternal(value: string | null) { raw = value; },
    get raw() { return raw; },
    get writes() { return writes; },
  };
}

function application() {
  const result = createApplicationRecord({ id: "app-test", job: hamiltonJob, profile: createDemoProfile(), now: "2026-10-12T12:00:00.000Z" });
  assert.ok(result);
  return result;
}

console.log("── Running Applications Storage Tests ──");

check("An empty Applications store starts without fixtures or writes", () => {
  const storage = memoryStorage();
  const loaded = loadApplicationsStorage(storage);
  assert.deepEqual(loaded.applications, []);
  assert.equal(loaded.canPersist, true);
  assert.equal(loaded.raw, null);
  assert.equal(storage.writes, 0);
});

check("Valid job, analysis, evidence and status history survive versioned reload", () => {
  const record = application();
  const storage = memoryStorage();
  const saved = saveApplicationsToStorage([record], storage, null);
  assert.equal(saved.saved, true);
  assert.equal(saved.raw, storage.raw);
  assert.equal(JSON.parse(storage.raw!).version, CURRENT_APPLICATIONS_VERSION);
  const loaded = loadApplicationsStorage(storage);
  assert.equal(loaded.canPersist, true);
  assert.deepEqual(loaded.applications, [record]);
  assert.equal(storage.writes, 1);
});

check("Corrupt JSON, empty strings and invalid envelope formats remain untouched", () => {
  for (const original of ["", '{"version":1,"applications":', "null", "[]", "42"]) {
    const storage = memoryStorage(original);
    const loaded = loadApplicationsStorage(storage);
    assert.equal(loaded.canPersist, false);
    assert.deepEqual(loaded.applications, []);
    assert.equal(loaded.raw, original);
    assert.ok(loaded.issue);
    assert.equal(saveApplicationsToStorage([application()], storage).saved, false);
    assert.equal(storage.raw, original);
    assert.equal(storage.writes, 0);
  }
});

check("Unsupported versions preserve every original byte", () => {
  const original = JSON.stringify({ version: CURRENT_APPLICATIONS_VERSION + 1, applications: [application()], futureField: "preserve" });
  const storage = memoryStorage(original);
  const loaded = loadApplicationsStorage(storage);
  assert.equal(loaded.canPersist, false);
  assert.match(loaded.issue ?? "", /unsupported version/);
  assert.equal(loaded.raw, original);
  assert.equal(saveApplicationsToStorage([], storage).saved, false);
  assert.equal(storage.raw, original);
});

check("Invalid incoming records cannot overwrite a valid archive", () => {
  const original = serializeApplications([application()]);
  const storage = memoryStorage(original);
  const invalid = application();
  invalid.fitScore = 100;
  invalid.snapshots = [];
  const saved = saveApplicationsToStorage([invalid], storage, original);
  assert.equal(saved.saved, false);
  assert.ok(saved.issue);
  assert.equal(storage.raw, original);
  assert.equal(storage.writes, 0);
});

check("Invalid stored record collections are not repaired with demo applications", () => {
  for (const applications of [null, {}, [{ id: "broken" }]]) {
    const original = JSON.stringify({ version: 1, applications });
    const storage = memoryStorage(original);
    assert.equal(loadApplicationsStorage(storage).canPersist, false);
    assert.equal(saveApplicationsToStorage([], storage).saved, false);
    assert.equal(storage.raw, original);
  }
});

check("Stale checkpoints protect another tab on saves and repeated retries", () => {
  const storage = memoryStorage(serializeApplications([]));
  const writerA = loadApplicationsStorage(storage);
  const writerB = loadApplicationsStorage(storage);
  const savedB = saveApplicationsToStorage([application()], storage, writerB.raw);
  assert.equal(savedB.saved, true);
  const external = storage.raw;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const failedA = saveApplicationsToStorage(writerA.applications, storage, writerA.raw);
    assert.equal(failedA.saved, false);
    assert.match(failedA.issue ?? "", /another tab/);
    assert.equal(failedA.raw, external);
    assert.equal(storage.raw, external);
  }
  assert.equal(storage.writes, 1);
});

check("An absent-key checkpoint cannot overwrite applications first saved elsewhere", () => {
  const storage = memoryStorage();
  const old = loadApplicationsStorage(storage);
  assert.equal(saveApplicationsToStorage([application()], storage, null).saved, true);
  const external = storage.raw;
  assert.equal(saveApplicationsToStorage(old.applications, storage, old.raw).saved, false);
  assert.equal(storage.raw, external);
});

check("An externally cleared key still invalidates the old writer", () => {
  const original = serializeApplications([application()]);
  const storage = memoryStorage(original);
  storage.setExternal(null);
  const result = saveApplicationsToStorage([application()], storage, original);
  assert.equal(result.saved, false);
  assert.equal(result.raw, null);
  assert.equal(storage.raw, null);
});

check("Blocked reads and quota failures report errors without claiming persistence", () => {
  const blockedRead = {
    getItem(): string | null { throw new Error("Denied"); },
    setItem() { throw new Error("Must not write"); },
  };
  assert.equal(loadApplicationsStorage(blockedRead).canPersist, false);
  assert.equal(saveApplicationsToStorage([], blockedRead).saved, false);
  const original = serializeApplications([]);
  const blockedWrite = {
    getItem() { return original; },
    setItem() { throw new Error("Quota exceeded"); },
  };
  const failed = saveApplicationsToStorage([application()], blockedWrite, original);
  assert.equal(failed.saved, false);
  assert.equal(failed.raw, original);
  assert.match(failed.issue ?? "", /could not be saved/);
});

check("Duplicate saves check their checkpoint while avoiding redundant writes", () => {
  const storage = memoryStorage(serializeApplications([application()]));
  const loaded = loadApplicationsStorage(storage);
  assert.equal(saveApplicationsToStorage(loaded.applications, storage, loaded.raw).saved, true);
  assert.equal(storage.writes, 0);
  storage.setExternal(serializeApplications([]));
  assert.equal(saveApplicationsToStorage(loaded.applications, storage, loaded.raw).saved, false);
  assert.equal(storage.writes, 0);
});

console.log(`\nAll ${passed} Applications storage cases passed.`);
