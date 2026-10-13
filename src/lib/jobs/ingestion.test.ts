import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { createApplicationRecord, normalizeApplications } from "@/lib/applications/domain";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import type { JobDraftInput } from "@/types/job";
import { createRequirementDraft, getJobEvidenceOptions, MAX_JOB_DESCRIPTION_LENGTH, reviewJobInput, suggestJobRequirements } from "./ingestion";

function fixture() {
  const profile = createDemoProfile();
  const draft: JobDraftInput = {
    company: "Independent Research", role: "Experiment Designer", location: "Istanbul", sourceUrl: "https://example.com/jobs/research",
    rawDescription: "Requirements:\n- Design reproducible experiments in virtual reality.\n- Python experience is preferred.\n- Swiss work authorization is mandatory.",
    requirements: suggestJobRequirements("Requirements:\n- Design reproducible experiments in virtual reality.\n- Python experience is preferred.\n- Swiss work authorization is mandatory."),
  };
  draft.requirements[2].acceptedRegions = "Switzerland, EU, EFTA";
  return { profile, draft };
}

test("requirement suggestions preserve employer quotes and leave candidate evidence empty", () => {
  const { draft } = fixture();
  assert.equal(draft.requirements.length, 3);
  assert.equal(draft.requirements[0].importance, "core");
  assert.equal(draft.requirements[1].importance, "preferred");
  assert.equal(draft.requirements[2].importance, "critical");
  assert.equal(draft.requirements[2].category, "work_authorization");
  assert.equal(draft.requirements[2].sponsorship, "unknown");
  for (const requirement of draft.requirements) {
    assert.ok(draft.rawDescription.includes(requirement.sourceText));
    assert.deepEqual(requirement.profileMatches, []);
  }
});

test("inline requirement headings retain substantive source text", () => {
  const source = "Requirements: experience designing experiments.\nQualifications: a relevant degree.";
  assert.equal(suggestJobRequirements(source).length, 2);
  assert.equal(suggestJobRequirements(source)[0].sourceText, "Requirements: experience designing experiments.");
});

test("long descriptions and large lists stay within review limits", () => {
  assert.deepEqual(suggestJobRequirements("x".repeat(MAX_JOB_DESCRIPTION_LENGTH + 1)), []);
  const source = Array.from({ length: 40 }, (_, index) => `Design experiment number ${index} carefully`).join("\n");
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 30);
  assert.equal(new Set(requirements.map((requirement) => requirement.id)).size, 30);
  assert.ok(requirements.every((requirement) => source.includes(requirement.sourceText)));
});

test("review accepts an actual independent posting without Profile mutations or invented evidence", () => {
  const { profile, draft } = fixture();
  const original = structuredClone({ profile, draft });
  const { job, error } = reviewJobInput(draft, profile);
  assert.equal(error, null);
  assert.ok(job);
  assert.equal(job.company, draft.company);
  assert.equal(job.rawDescription, draft.rawDescription);
  const analysis = buildJobAnalysis({ job, profile });
  assert.equal(analysis.overallFit, 0);
  assert.equal(analysis.criticalIssues[0].status, "needs_confirmation");
  assert.deepEqual({ profile, draft }, original);
});

test("verified evidence choices exclude pending claims and claims inside unverified parents", () => {
  const { profile } = fixture();
  const record = profile.experiences[0];
  record.responsibilities[0].verificationStatus = "draft";
  const draftId = record.responsibilities[0].id;
  assert.ok(!getJobEvidenceOptions(profile).some((item) => item.link.claimId === draftId));
  record.verificationStatus = "needs_confirmation";
  assert.ok(!getJobEvidenceOptions(profile).some((item) => item.recordId === record.id));
  assert.ok(getJobEvidenceOptions(profile).every((item) => item.usable));
});

test("an explicit verified evidence link changes deterministic fit and archives confirmed provenance", () => {
  const { profile, draft } = fixture();
  const claim = profile.experiences[0].responsibilities[0];
  draft.requirements[0].profileMatches = [{ link: { recordType: "experience", recordId: profile.experiences[0].id, claimId: claim.id }, relevance: "direct" }];
  const { job } = reviewJobInput(draft, profile);
  assert.ok(job);
  const analysis = buildJobAnalysis({ job, profile });
  assert.equal(analysis.overallFit, 78);
  assert.equal(analysis.coreFit, 100);
  const application = createApplicationRecord({ id: "imported-application", job, profile });
  assert.ok(application);
  assert.equal(application.snapshots[0].evidence[0].excerpt, claim.text);
  assert.equal(application.snapshots[0].analysis.requirements[0].profileMatches![0].link.claimId, claim.id);
  assert.ok(normalizeApplications([application]));
});

test("review rejects missing, draft and subsequently unconfirmed selected evidence", () => {
  for (const state of ["missing", "draft", "parent"] as const) {
    const { profile, draft } = fixture();
    const record = profile.experiences[0];
    const claim = record.responsibilities[0];
    draft.requirements[0].profileMatches = [{ link: { recordType: "experience", recordId: record.id, claimId: claim.id }, relevance: "direct" }];
    if (state === "missing") record.responsibilities = [];
    else if (state === "draft") claim.verificationStatus = "draft";
    else record.verificationStatus = "needs_confirmation";
    const result = reviewJobInput(draft, profile);
    assert.equal(result.job, null);
    assert.match(result.error!, /missing or no longer verified/);
  }
});

test("only verbatim employer source quotes can support a reviewed requirement", () => {
  const { profile, draft } = fixture();
  draft.requirements[0].sourceText = "A fabricated requirement not in this job";
  assert.equal(reviewJobInput(draft, profile).job, null);
  assert.match(reviewJobInput(draft, profile).error!, /original job description/);
});

test("unknown sponsorship does not become an invented hard blocker", () => {
  const { profile, draft } = fixture();
  profile.workAuthorizations = [{ id: "wa", countryOrRegion: "Switzerland", status: "requires_sponsorship",
    verificationStatus: "verified", source: "user", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];
  for (const [policy, expected] of [["unknown", "needs_confirmation"], ["available", "satisfied"], ["unavailable", "unmet"]] as const) {
    draft.requirements[2].sponsorship = policy;
    const { job } = reviewJobInput(draft, profile);
    assert.ok(job);
    const analysis = buildJobAnalysis({ job, profile });
    assert.equal(analysis.criticalIssues[0].status, expected);
    const application = createApplicationRecord({ id: "app", profile, job });
    assert.ok(application);
    assert.ok(normalizeApplications([application]));
  }
});

test("eligibility accepted regions and a core requirement must be reviewed before analysis", () => {
  const { profile, draft } = fixture();
  draft.requirements[2].acceptedRegions = "";
  assert.match(reviewJobInput(draft, profile).error!, /accepted work-authorization regions/);
  draft.requirements = [draft.requirements[1]];
  assert.match(reviewJobInput(draft, profile).error!, /at least one core requirement/);
});

test("review projects known fields and discards candidate wording and score overrides", () => {
  const { profile, draft } = fixture();
  const option = getJobEvidenceOptions(profile)[0];
  draft.requirements[0].profileMatches = [{ link: option.link, relevance: "adjacent" }];
  Object.assign(draft.requirements[0], { evidenceStrength: "strong", userOverride: { confirmed: true }, evidence: [{ evidenceText: "Invented candidate experience" }] });
  Object.assign(draft.requirements[0].profileMatches[0], { candidateExperience: "Invented candidate experience" });
  const { job } = reviewJobInput(draft, profile);
  assert.ok(job);
  assert.doesNotMatch(JSON.stringify(job), /Invented candidate experience|userOverride|evidenceStrength/);
  assert.equal(buildJobAnalysis({ job, profile }).requirements[0].evidenceStrength, "partial");
});

test("invalid details, duplicate evidence and oversized inputs produce actionable errors", () => {
  const mutations = [
    (draft: JobDraftInput) => { draft.sourceUrl = "javascript:alert(1)"; },
    (draft: JobDraftInput) => { draft.company = " "; },
    (draft: JobDraftInput) => { draft.rawDescription = "x".repeat(MAX_JOB_DESCRIPTION_LENGTH + 1); },
    (draft: JobDraftInput) => { draft.requirements = []; },
    (draft: JobDraftInput) => { draft.requirements[1].id = draft.requirements[0].id; },
  ];
  for (const mutate of mutations) {
    const { profile, draft } = fixture(); mutate(draft); const result = reviewJobInput(draft, profile);
    assert.equal(result.job, null); assert.ok(result.error);
  }
  const { profile, draft } = fixture();
  const option = getJobEvidenceOptions(profile)[0];
  draft.requirements[0].profileMatches = [{ link: option.link, relevance: "direct" }, { link: option.link, relevance: "adjacent" }];
  assert.match(reviewJobInput(draft, profile).error!, /only once/);
});

test("manual requirements have no inferred evidence or eligibility facts", () => {
  assert.deepEqual(createRequirementDraft("manual-1"), { id: "manual-1", label: "", sourceText: "", importance: "core",
    category: "other", profileMatches: [], isHardBlocker: false, acceptedRegions: "", sponsorship: "unknown" });
});

test("runtime enum arrays cannot evade scoring or turn unknown sponsorship into unavailable", () => {
  for (const field of ["importance", "category", "sponsorship"] as const) {
    const { profile, draft } = fixture();
    Object.assign(draft.requirements[1], { [field]: [draft.requirements[1][field]] });
    assert.equal(reviewJobInput(draft, profile).job, null);
  }
  const { profile, draft } = fixture();
  draft.requirements[0].profileMatches = [{ link: getJobEvidenceOptions(profile)[0].link, relevance: ["direct"] as unknown as "direct" }];
  assert.equal(reviewJobInput(draft, profile).job, null);
});

test("evidence IDs containing separators remain distinct across reviewed links", () => {
  const { profile, draft } = fixture();
  const record = profile.experiences[0];
  record.id = "a:b";
  record.responsibilities[0].id = "c";
  const second = structuredClone(record);
  second.id = "a";
  second.responsibilities = [structuredClone(record.responsibilities[0])];
  second.responsibilities[0].id = "b:c";
  profile.experiences.push(second);
  draft.requirements[0].profileMatches = [
    { link: { recordType: "experience", recordId: "a:b", claimId: "c" }, relevance: "direct" },
    { link: { recordType: "experience", recordId: "a", claimId: "b:c" }, relevance: "adjacent" },
  ];
  const { job, error } = reviewJobInput(draft, profile);
  assert.equal(error, null);
  assert.ok(job);
  assert.equal(job.requirements[0].profileMatches!.length, 2);
});

test("JSON enum objects are rejected without invoking their coercion hooks", () => {
  for (const field of ["importance", "category", "sponsorship"] as const) {
    const { profile, draft } = fixture();
    Object.assign(draft.requirements[0], { [field]: { toString: null } });
    assert.equal(reviewJobInput(draft, profile).job, null);
  }
});
