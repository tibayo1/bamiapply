import assert from "node:assert/strict";
import { test } from "node:test";
import type { JobPosting } from "@/types/analysis";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { calculateFit, evaluateCriticalRequirements } from "@/lib/analysis/scoring";
import { determineRecommendation } from "@/lib/analysis/recommendation";
import {
  changeApplicationStatus, createApplicationRecord, getLatestSnapshot,
  isApplicationAnalysisStale, normalizeApplications, normalizeJobPosting, refreshApplicationRecord,
} from "./domain";

const captured = "2026-10-12T12:00:00.000Z";
const later = "2026-10-15T12:00:00.000Z";
function fixture() {
  const profile = createDemoProfile();
  const experience = profile.experiences[0];
  const claim = experience.responsibilities[0];
  const job: JobPosting = {
    id: "independent-job", company: "Evidence Lab", role: "Experiment Designer", location: "Istanbul",
    requirements: [{ id: "experiments", label: "Design experiments", category: "experience", importance: "core",
      profileMatches: [{ link: { recordType: "experience", recordId: experience.id, claimId: claim.id }, relevance: "direct" }] }],
  };
  return { profile, job, claim };
}
function record() {
  const { profile, job } = fixture();
  const result = createApplicationRecord({ id: "application-domain", profile, job, now: captured });
  assert.ok(result);
  return result;
}

test("save archives the actual job and confirmed evidence without mutating either source", () => {
  const { profile, job, claim } = fixture();
  const original = structuredClone({ profile, job });
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  const snapshot = getLatestSnapshot(application);
  assert.equal(application.company, "Evidence Lab");
  assert.equal(snapshot.analysis.overallFit, 100);
  assert.equal(snapshot.evidence[0].excerpt, claim.text);
  assert.deepEqual({ profile, job }, original);
  profile.experiences[0].responsibilities[0].text = "Later change";
  job.role = "Later job change";
  assert.equal(snapshot.evidence[0].excerpt, original.profile.experiences[0].responsibilities[0].text);
  assert.equal(application.role, "Experiment Designer");
  assert.deepEqual(normalizeApplications([application]), [application]);
});

test("candidate-provided scores, evidence and what-if fields are excluded from job input", () => {
  const { profile, job } = fixture();
  Object.assign(job.requirements[0], { evidenceStrength: "strong", criticalStatus: "satisfied",
    userOverride: { confirmed: true, note: "Invented proof" }, evidence: [{ evidenceText: "Invented proof" }] });
  profile.experiences = [];
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  assert.equal(application.fitScore, 0);
  assert.doesNotMatch(JSON.stringify(application), /Invented proof|userOverride/);
  assert.ok(normalizeApplications([application]));
});

test("unconfirmed evidence retains status pointers without archiving unconfirmed prose", () => {
  const { profile, job, claim } = fixture();
  claim.text = "An unconfirmed imported statement";
  claim.verificationStatus = "needs_confirmation";
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  const snapshot = getLatestSnapshot(application);
  assert.equal(snapshot.analysis.requirements[0].evidenceStrength, "needs_confirmation");
  assert.equal(snapshot.evidence.length, 0);
  assert.equal(snapshot.unconfirmedEvidence.length, 1);
  assert.doesNotMatch(JSON.stringify(application), /An unconfirmed imported statement/);
  assert.ok(normalizeApplications([application]));
});

test("unsupported uncertainty cannot inflate a stored fit even with recomputed metrics", () => {
  const { profile, job } = fixture();
  job.requirements.push({ id: "missing", label: "Missing evidence", category: "skill", importance: "core" });
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  assert.equal(application.fitScore, 50);
  const analysis = getLatestSnapshot(application).analysis;
  analysis.requirements[1].evidenceStrength = "needs_confirmation";
  const metrics = calculateFit(analysis.requirements);
  const gates = evaluateCriticalRequirements(analysis.requirements);
  Object.assign(analysis, metrics, determineRecommendation(metrics, gates, analysis.requirements), { criticalIssues: gates });
  application.fitScore = analysis.overallFit;
  application.recommendation = analysis.recommendation;
  assert.equal(application.fitScore, 100);
  assert.equal(normalizeApplications([application]), null);
});

test("claim source and derivation IDs survive historical capture", () => {
  const { profile, job, claim } = fixture();
  claim.sourceRecordId = "original-import-record";
  claim.derivedFromClaimId = "original-claim";
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  assert.equal(getLatestSnapshot(application).evidence[0].sourceRecordId, "original-import-record");
  assert.equal(getLatestSnapshot(application).evidence[0].derivedFromClaimId, "original-claim");
  assert.ok(normalizeApplications([application]));
});

test("explicit refresh appends a new snapshot and preserves earlier verified wording", () => {
  const { profile, job, claim } = fixture();
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  const original = structuredClone(application);
  claim.verificationStatus = "draft";
  claim.text = "Pending revised claim";
  assert.equal(isApplicationAnalysisStale(application, profile, new Date(later)), true);
  const refreshed = refreshApplicationRecord(application, profile, later);
  assert.ok(refreshed);
  assert.equal(refreshed.snapshots.length, 2);
  assert.deepEqual(refreshed.snapshots[0], original.snapshots[0]);
  assert.equal(refreshed.fitScore, 0);
  assert.deepEqual(application, original);
  assert.ok(normalizeApplications([refreshed]));
  assert.equal(refreshApplicationRecord(refreshed, profile, later), refreshed);
});

test("authorization expiration without Profile edits enables refresh and preserves the original gate", () => {
  const { profile, job } = fixture();
  profile.workAuthorizations = [{ id: "wa", countryOrRegion: "Switzerland", status: "authorized",
    source: "user", verificationStatus: "verified", createdAt: captured, updatedAt: captured, expiresAt: "2026-10-14" }];
  job.requirements.push({ id: "eligibility", label: "Work authorization", category: "work_authorization",
    importance: "critical", isHardBlocker: true, eligibility: { acceptedRegions: ["Switzerland"], sponsorshipAvailable: false } });
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  assert.equal(isApplicationAnalysisStale(application, profile, new Date(captured)), false);
  assert.equal(isApplicationAnalysisStale(application, profile, new Date(later)), true);
  const refreshed = refreshApplicationRecord(application, profile, later);
  assert.ok(refreshed);
  assert.equal(refreshed.snapshots.length, 2);
  assert.equal(refreshed.snapshots[0].analysis.criticalIssues[0].status, "satisfied");
  assert.equal(getLatestSnapshot(refreshed).analysis.criticalIssues[0].status, "needs_confirmation");
  assert.equal(refreshed.fitScore, 100);
  assert.ok(normalizeApplications([refreshed]));
});

test("eligibility blockers remain separate from scores and preserve critical rationale", () => {
  const { profile, job } = fixture();
  profile.workAuthorizations = [{ id: "wa", countryOrRegion: "Switzerland", status: "requires_sponsorship",
    source: "user", verificationStatus: "verified", createdAt: captured, updatedAt: captured }];
  job.requirements.push({ id: "eligibility", label: "Work authorization", category: "work_authorization",
    importance: "critical", isHardBlocker: true, rationale: "Employer eligibility rule", notes: { none: "Scored absence note" },
    eligibility: { acceptedRegions: ["Switzerland"], sponsorshipAvailable: false } });
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  assert.equal(application.fitScore, 100);
  assert.equal(application.recommendation, "Skip");
  assert.equal(getLatestSnapshot(application).analysis.requirements[1].rationale, "Employer eligibility rule");
  assert.ok(normalizeApplications([application]));
});

test("tracking appends status history and clears skip reason without changing assessment", () => {
  const application = record();
  const skipped = changeApplicationStatus(application, "Skipped", "Location mismatch", later);
  const restored = changeApplicationStatus(skipped, "Saved", undefined, later);
  assert.equal(skipped.skipReason, "Location mismatch");
  assert.equal(restored.skipReason, undefined);
  assert.deepEqual(restored.snapshots, application.snapshots);
  assert.equal(restored.statusHistory[1].reason, "Location mismatch");
  assert.equal(restored.statusHistory.length, 3);
  assert.ok(normalizeApplications([restored]));
});

test("foreign Profile IDs and earlier refresh timestamps are rejected", () => {
  const application = record();
  const { profile } = fixture();
  profile.id = "another-profile";
  assert.equal(refreshApplicationRecord(application, profile, later), null);
  profile.id = application.profileId;
  assert.equal(refreshApplicationRecord(application, profile, "2026-10-11T00:00:00.000Z"), null);
  application.snapshots[0].profileRevision = "another-profile:revision";
  assert.equal(normalizeApplications([application]), null);
});

test("invalid scores, excerpts, provenance and authorization metadata cannot be silently repaired", () => {
  const mutations = [
    (value: ReturnType<typeof record>) => { value.fitScore = 10; },
    (value: ReturnType<typeof record>) => { value.snapshots[0].evidence[0].excerpt = "Fabricated experience"; },
    (value: ReturnType<typeof record>) => { value.snapshots[0].evidence[0].verificationStatus = "draft" as "verified"; },
    (value: ReturnType<typeof record>) => { Reflect.deleteProperty(value.snapshots[0].authorizations[0], "source"); },
    (value: ReturnType<typeof record>) => { value.snapshots[0].analysis.requirements[0].evidence = []; },
  ];
  for (const mutate of mutations) { const value = record(); mutate(value); assert.equal(normalizeApplications([value]), null); }
});

test("duplicate requirement links and invalid source URLs are rejected at the job boundary", () => {
  const { job } = fixture();
  job.requirements[0].profileMatches!.push({ ...job.requirements[0].profileMatches![0], relevance: "adjacent" });
  assert.equal(normalizeJobPosting(job), null);
  for (const url of ["javascript:alert(1)", "https://", "file:///tmp/job"]) {
    const value = fixture().job; value.sourceUrl = url; assert.equal(normalizeJobPosting(value), null);
  }
});

test("nested job-side matches cannot carry candidate prose and pending pointers reject extra wording", () => {
  const { profile, job, claim } = fixture();
  Object.assign(job.requirements[0].profileMatches![0], { candidateExperience: "Invented candidate experience" });
  Object.assign(job.requirements[0].profileMatches![0].link, { evidenceText: "Invented candidate experience" });
  claim.verificationStatus = "draft";
  const application = createApplicationRecord({ id: "app", profile, job, now: captured });
  assert.ok(application);
  assert.doesNotMatch(JSON.stringify(application), /Invented candidate experience/);
  assert.ok(normalizeApplications([application]));
  Object.assign(getLatestSnapshot(application).unconfirmedEvidence[0], { evidenceText: "Unconfirmed prose" });
  assert.equal(normalizeApplications([application]), null);
});

test("parseable explicit capture dates are canonicalized before persistence", () => {
  const { profile, job } = fixture();
  const application = createApplicationRecord({ id: "app", profile, job, now: "2026-10-13" });
  assert.ok(application);
  assert.equal(getLatestSnapshot(application).capturedAt, "2026-10-13T00:00:00.000Z");
  assert.ok(normalizeApplications([application]));
});

test("JSON enum arrays and objects cannot bypass job or application validation", () => {
  for (const field of ["importance", "category"] as const) {
    for (const value of [["core"], { toString: null }]) {
      const { job } = fixture(); Object.assign(job.requirements[0], { [field]: value });
      assert.equal(normalizeJobPosting(job), null);
    }
  }
  const application = record();
  Object.assign(application, { cvStatus: ["Not started"] });
  assert.equal(normalizeApplications([application]), null);
});
