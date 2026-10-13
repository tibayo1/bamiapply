import assert from "node:assert/strict";
import type { JobDraftInput, ReviewedJobRecord } from "@/types/job";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { createJobsStore } from "./provider-state";
import { CURRENT_JOBS_VERSION, JOBS_STORAGE_KEY, loadJobsStorage, normalizeReviewedJobs, saveJobsToStorage, serializeJobs } from "./storage";

let passed = 0;
function check(label: string, run: () => void) {
  run(); passed += 1; console.log(`✓ ${label}`);
}
function memoryStorage(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  let failReads = false;
  let failWrites = false;
  return {
    getItem(key: string) { assert.equal(key, JOBS_STORAGE_KEY, "Job commands must only access the Jobs key"); if (failReads) throw new Error("Denied"); return raw; },
    setItem(key: string, value: string) { assert.equal(key, JOBS_STORAGE_KEY); if (failWrites) throw new Error("Quota"); raw = value; writes += 1; },
    setExternal(value: string | null) { raw = value; },
    set failReads(value: boolean) { failReads = value; },
    set failWrites(value: boolean) { failWrites = value; },
    get raw() { return raw; },
    get writes() { return writes; },
  };
}
function draft(): JobDraftInput {
  return {
    company: "Example Medical", role: "Research Engineer", location: "Remote", sourceUrl: "https://example.com/jobs/research",
    rawDescription: "Build biomedical devices. Work with human participants.",
    requirements: [{ id: "req-design", label: "Biomedical device development", sourceText: "Build biomedical devices.", importance: "core", category: "experience", profileMatches: [], isHardBlocker: false, acceptedRegions: "", sponsorship: "unknown" }],
  };
}
function record(): ReviewedJobRecord {
  return {
    id: "job-test", profileId: createDemoProfile().id, createdAt: "2026-10-13T12:00:00.000Z",
    posting: { id: "job-test", company: "Example Medical", role: "Research Engineer", location: "Remote", rawDescription: draft().rawDescription,
      requirements: [{ id: "req-design", label: "Biomedical device development", sourceText: "Build biomedical devices.", importance: "core", category: "experience" }] },
  };
}
function setup(initial: string | null = null) {
  const storage = memoryStorage(initial);
  let sequence = 0;
  const store = createJobsStore({ storage, createId: () => `job-${++sequence}` });
  return { storage, store, profile: createDemoProfile() };
}

console.log("── Running Reviewed Jobs Persistence Tests ──");

check("A new Jobs workspace is empty and hydration makes no writes", () => {
  const { store, storage, profile } = setup();
  assert.deepEqual(store.getServerSnapshot().jobs, []);
  assert.equal(store.getSnapshot().isHydrated, false);
  assert.ok(store.actions.importJob(draft(), profile).error);
  store.hydrate();
  assert.equal(store.getSnapshot().isHydrated, true);
  assert.equal(store.getSnapshot().canPersist, true);
  assert.deepEqual(store.getSnapshot().jobs, []);
  assert.equal(storage.raw, null);
  assert.equal(storage.writes, 0);
});

check("Reviewed import is durable before returning a generated route ID", () => {
  const { store, storage, profile } = setup();
  const profileBefore = structuredClone(profile);
  store.hydrate();
  const result = store.actions.importJob(draft(), profile);
  assert.equal(result.error, null);
  assert.equal(result.id, "job-1");
  const persisted = JSON.parse(storage.raw!);
  assert.equal(persisted.version, CURRENT_JOBS_VERSION);
  assert.equal(persisted.jobs[0].id, result.id);
  assert.equal(persisted.jobs[0].posting.id, result.id);
  assert.equal(persisted.jobs[0].profileId, profile.id);
  assert.deepEqual(profile, profileBefore);
  const restored = createJobsStore({ storage }); restored.hydrate();
  assert.deepEqual(restored.getSnapshot().jobs, store.getSnapshot().jobs);
});

check("Profile-scoped lookup cannot expose another Profile's reviewed job", () => {
  const { store, profile } = setup(); store.hydrate();
  const result = store.actions.importJob(draft(), profile);
  assert.ok(result.id);
  assert.ok(store.actions.getJob(result.id, profile.id));
  assert.equal(store.actions.getJob(result.id, "other-profile"), undefined);
  assert.equal(store.actions.getJob("missing-job", profile.id), undefined);
});

check("Published posting data is immutable while source inputs remain editable", () => {
  const { store, profile, storage } = setup(); store.hydrate();
  const input = draft();
  input.requirements[0].profileMatches = [{ link: { recordType: "experience", recordId: profile.experiences[0].id, claimId: profile.experiences[0].responsibilities[0].id }, relevance: "direct" }];
  const result = store.actions.importJob(input, profile); assert.ok(result.id);
  const saved = store.actions.getJob(result.id, profile.id)!;
  const before = structuredClone(saved);
  const raw = storage.raw;
  assert.equal(Reflect.set(saved.posting, "company", "Changed"), false);
  assert.equal(Reflect.set(saved.posting.requirements[0], "label", "Invented"), false);
  assert.equal(Reflect.set(saved.posting.requirements[0].profileMatches![0].link, "recordId", "invented"), false);
  assert.throws(() => store.getSnapshot().jobs.pop(), TypeError);
  assert.equal(Reflect.set(store.getServerSnapshot(), "isHydrated", true), false);
  input.requirements[0].profileMatches[0].link.recordId = "changed-form";
  profile.personal.name = "Changed source Profile";
  assert.deepEqual(saved, before);
  assert.equal(storage.raw, raw);
});

check("Invalid reviewed input neither writes nor creates a saved record", () => {
  const { store, storage, profile } = setup(); store.hydrate();
  const invalid = draft(); invalid.requirements[0].sourceText = "Invented qualification absent from the posting";
  const result = store.actions.importJob(invalid, profile);
  assert.equal(result.id, null); assert.ok(result.error);
  assert.deepEqual(store.getSnapshot().jobs, []);
  assert.equal(storage.writes, 0);
});

check("Quota failures never return a saved route ID or mutate published jobs", () => {
  const { store, storage, profile } = setup(); store.hydrate();
  storage.failWrites = true;
  const failed = store.actions.importJob(draft(), profile);
  assert.equal(failed.id, null); assert.ok(failed.error);
  assert.deepEqual(store.getSnapshot().jobs, []);
  assert.equal(store.getSnapshot().canPersist, false);
  assert.equal(storage.raw, null);
  storage.failWrites = false;
  store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, true);
  assert.ok(store.actions.importJob(draft(), profile).id);
});

check("Corrupt and unsupported saved bytes remain exact across import and retries", () => {
  for (const original of ["", "broken-json", "null", "[]", '{"version":1,"jobs":{}}', JSON.stringify({ version: CURRENT_JOBS_VERSION + 1, jobs: [record()], future: "retain" })]) {
    const { store, storage, profile } = setup(original); store.hydrate();
    assert.equal(store.getSnapshot().canPersist, false);
    assert.ok(store.actions.importJob(draft(), profile).error);
    store.actions.retryPersistence();
    assert.equal(store.actions.getJobsRecoveryData(), original);
    assert.equal(store.actions.getJobsExportData(), serializeJobs([]));
    assert.equal(storage.raw, original);
    assert.equal(storage.writes, 0);
  }
});

check("Persisted records reject candidate evidence, overrides and fabricated score fields", () => {
  const variants = [
    (job: ReviewedJobRecord) => Object.assign(job.posting.requirements[0], { evidence: [{ evidenceText: "Invented candidate experience" }] }),
    (job: ReviewedJobRecord) => Object.assign(job.posting.requirements[0], { userOverride: { confirmed: true } }),
    (job: ReviewedJobRecord) => Object.assign(job.posting.requirements[0], { evidenceStrength: "strong" }),
    (job: ReviewedJobRecord) => Object.assign(job.posting, { fitScore: 100 }),
    (job: ReviewedJobRecord) => Object.assign(job, { candidateClaim: "Invented" }),
    (job: ReviewedJobRecord) => { job.posting.requirements[0].profileMatches = [{ link: { recordType: "experience", recordId: "later-removed" }, relevance: "direct" }]; Object.assign(job.posting.requirements[0].profileMatches[0].link, { evidenceText: "Invented" }); },
  ];
  for (const mutate of variants) {
    const job = record(); mutate(job);
    const original = serializeJobs([job]);
    const storage = memoryStorage(original);
    assert.equal(loadJobsStorage(storage).canPersist, false);
    assert.equal(saveJobsToStorage([], storage, original).saved, false);
    assert.equal(storage.raw, original);
  }
});

check("Persisted requirements need a quoted source and at least one scored core requirement", () => {
  const variants = [
    (job: ReviewedJobRecord) => { job.posting.rawDescription = ""; },
    (job: ReviewedJobRecord) => { job.posting.requirements[0].sourceText = "Not in the source"; },
    (job: ReviewedJobRecord) => { job.posting.requirements[0].importance = "critical"; },
    (job: ReviewedJobRecord) => { job.posting.requirements = []; },
    (job: ReviewedJobRecord) => { job.posting.id = "job-another"; },
    (job: ReviewedJobRecord) => { job.profileId = ""; },
    (job: ReviewedJobRecord) => { job.createdAt = "not-a-date"; },
  ];
  for (const mutate of variants) { const job = record(); mutate(job); assert.equal(normalizeReviewedJobs([job]), null); }
  assert.equal(normalizeReviewedJobs([record(), record()]), null);
});

check("Deleted Profile records do not make a reviewed employer posting unreadable", () => {
  const job = record();
  job.posting.requirements[0].profileMatches = [{ link: { recordType: "experience", recordId: "removed-after-import", claimId: "removed-claim" }, relevance: "adjacent" }];
  const storage = memoryStorage(serializeJobs([job]));
  const loaded = loadJobsStorage(storage);
  assert.equal(loaded.canPersist, true);
  assert.deepEqual(loaded.jobs, [job]);
});

check("Unspecified sponsorship stays unknown through reviewed import and reload", () => {
  const { store, storage, profile } = setup(); store.hydrate();
  const input = draft();
  input.rawDescription += " Must have authorization to work in Switzerland.";
  input.requirements.push({ id: "req-eligibility", label: "Work authorization", sourceText: "Must have authorization to work in Switzerland.", importance: "critical", category: "work_authorization", profileMatches: [], isHardBlocker: true, acceptedRegions: "Switzerland", sponsorship: "unknown" });
  const result = store.actions.importJob(input, profile); assert.ok(result.id);
  assert.equal(store.actions.getJob(result.id, profile.id)!.posting.requirements[1].eligibility!.sponsorshipAvailable, null);
  const restored = createJobsStore({ storage }); restored.hydrate();
  assert.equal(restored.getSnapshot().canPersist, true);
  assert.equal(restored.actions.getJob(result.id, profile.id)!.posting.requirements[1].eligibility!.sponsorshipAvailable, null);
});

check("Duplicate generated IDs are rejected without replacing a reviewed posting", () => {
  const storage = memoryStorage();
  const store = createJobsStore({ storage, createId: () => "job-collision" }); store.hydrate();
  const profile = createDemoProfile();
  assert.equal(store.actions.importJob(draft(), profile).id, "job-collision");
  const before = storage.raw;
  const second = draft(); second.company = "Another employer";
  assert.equal(store.actions.importJob(second, profile).id, null);
  assert.equal(storage.raw, before);
  assert.equal(store.getSnapshot().jobs.length, 1);
});

check("Two tabs cannot overwrite a newer saved job on import or repeated retries", () => {
  const storage = memoryStorage(serializeJobs([]));
  const first = createJobsStore({ storage, createId: () => "job-first" });
  const second = createJobsStore({ storage, createId: () => "job-second" });
  first.hydrate(); second.hydrate();
  const profile = createDemoProfile();
  assert.equal(second.actions.importJob(draft(), profile).id, "job-second");
  const newer = storage.raw;
  const failed = first.actions.importJob(draft(), profile);
  assert.equal(failed.id, null); assert.match(failed.error ?? "", /another tab/);
  for (let attempt = 0; attempt < 2; attempt += 1) first.actions.retryPersistence();
  assert.equal(storage.raw, newer);
  assert.equal(first.actions.getJobsRecoveryData(), newer);
  assert.equal(first.actions.getJobsExportData(), serializeJobs([]));
  assert.deepEqual(first.getSnapshot().jobs, []);
  assert.equal(storage.writes, 1);
});

check("Storage events pause writes while preserving the current tab's reviewed jobs", () => {
  const { store, storage, profile } = setup(); store.hydrate();
  assert.ok(store.actions.importJob(draft(), profile).id);
  const current = store.actions.getJobsExportData();
  const external = serializeJobs([record()]); storage.setExternal(external);
  store.observeExternalChanges();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.equal(store.actions.getJobsRecoveryData(), external);
  assert.equal(store.actions.getJobsExportData(), current);
  store.actions.retryPersistence();
  assert.equal(storage.raw, external);
});

check("Another tab's newly readable recovery data requires reload rather than adoption", () => {
  const { store, storage } = setup("broken-json"); store.hydrate();
  const recovered = serializeJobs([record()]); storage.setExternal(recovered);
  store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.match(store.getSnapshot().persistenceIssue ?? "", /reload/);
  assert.equal(store.actions.getJobsRecoveryData(), recovered);
  assert.deepEqual(store.getSnapshot().jobs, []);
  assert.equal(storage.raw, recovered);
  assert.equal(storage.writes, 0);
});

check("An externally deleted Jobs key does not restore stale reviewed jobs", () => {
  const { store, storage } = setup(serializeJobs([record()])); store.hydrate();
  const current = store.actions.getJobsExportData(); storage.setExternal(null);
  store.observeExternalChanges(); store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.equal(storage.raw, null);
  assert.equal(store.actions.getJobsExportData(), current);
  assert.equal(storage.writes, 0);
});

check("Unavailable reads report a paused store without writing or leaking errors", () => {
  const { store, storage } = setup(serializeJobs([record()])); storage.failReads = true;
  store.hydrate();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.ok(store.getSnapshot().persistenceIssue);
  store.actions.retryPersistence();
  assert.equal(storage.writes, 0);
  storage.failReads = false;
  store.actions.retryPersistence();
  assert.equal(store.getSnapshot().canPersist, false);
  assert.equal(storage.writes, 0);
});

check("Idempotent storage saves still check bytes before skipping the write", () => {
  const raw = serializeJobs(normalizeReviewedJobs([record()])!); const storage = memoryStorage(raw);
  assert.equal(saveJobsToStorage([record()], storage, raw).saved, true);
  assert.equal(storage.writes, 0);
  storage.setExternal(serializeJobs([]));
  assert.equal(saveJobsToStorage([record()], storage, raw).saved, false);
  assert.equal(storage.writes, 0);
});

console.log(`\nAll ${passed} reviewed Jobs persistence cases passed.`);
