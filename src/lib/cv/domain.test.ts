import assert from "node:assert/strict";
import { test } from "node:test";
import type { JobPosting } from "@/types/analysis";
import type { CVSelection } from "@/types/cv";
import type { EvidenceLink } from "@/types/profile";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { linkKey } from "@/lib/profile/evidence";
import { buildCVContent, createCVVersion, getCVCandidates, getDefaultCVSelection, isCVVersionStale, normalizeCVVersions } from "./domain";

const now = "2026-10-13T12:00:00.000Z";
function fixture() {
  const profile = createDemoProfile();
  const experience = profile.experiences[0];
  const claim = experience.responsibilities[0];
  const link: EvidenceLink = { recordType: "experience", recordId: experience.id, claimId: claim.id };
  const job: JobPosting = { id: "cv-job", company: "Evidence Lab", role: "Research Engineer", location: "Remote",
    requirements: [{ id: "experiments", label: "Design experiments", importance: "core", category: "experience",
      profileMatches: [{ link, relevance: "direct" }] }] };
  const application = { id: "cv-app", profileId: profile.id, job, company: job.company, role: job.role };
  const selection: CVSelection = { evidence: [link], skillIds: [] };
  return { profile, experience, claim, link, job, application, selection };
}
function version(status: "draft" | "reviewed" = "reviewed") {
  const data = fixture();
  const result = createCVVersion({ id: "cv-one", ...data, status, now });
  assert.ok(result);
  return { ...data, version: result };
}

test("a CV keeps verified claim wording, employer, dates and source derivation exactly", () => {
  const data = fixture();
  data.claim.source = "cv_import";
  data.claim.sourceRecordId = "original-record";
  data.claim.derivedFromClaimId = "original-claim";
  data.experience.startDate = "September 2022";
  const result = createCVVersion({ id: "v", ...data, status: "reviewed", now });
  assert.ok(result);
  assert.equal(result.content.personal.name, data.profile.personal.name);
  const entry = result.content.sections[0].entries[0];
  assert.equal(entry.title, data.experience.title);
  assert.equal(entry.subtitle, data.experience.organization);
  assert.equal(entry.dates, "September 2022 – Present");
  assert.deepEqual(entry.bullets, [data.claim.text]);
  assert.deepEqual(result.sourceProfile.experiences[0].responsibilities[0], data.claim);
  assert.deepEqual(normalizeCVVersions([result], data.application), [result]);
});

test("a verified claim inside an unconfirmed parent is never a candidate or export fact", () => {
  const data = fixture();
  data.experience.verificationStatus = "needs_confirmation";
  assert.equal(getCVCandidates(data.profile, data.job).some((candidate) => candidate.id === linkKey(data.link)), false);
  assert.equal(buildCVContent(data.profile, data.selection), null);
  assert.equal(createCVVersion({ id: "v", ...data, status: "reviewed", now }), null);
});

test("pending and draft claim text stays out of candidates, CV facts and source archives", () => {
  const data = fixture();
  data.experience.responsibilities[1].verificationStatus = "needs_confirmation";
  data.experience.responsibilities[1].text = "PENDING SECRET FACT";
  data.experience.responsibilities[2].verificationStatus = "draft";
  data.experience.responsibilities[2].text = "DRAFT SECRET FACT";
  const result = createCVVersion({ id: "v", ...data, status: "draft", now });
  assert.ok(result);
  assert.doesNotMatch(JSON.stringify(result), /PENDING SECRET FACT|DRAFT SECRET FACT/);
  assert.doesNotMatch(JSON.stringify(getCVCandidates(data.profile, data.job)), /PENDING SECRET FACT|DRAFT SECRET FACT/);
  assert.equal(result.sourceProfile.experiences[0].responsibilities.length, 1);
});

test("the default prioritizes explicit job links and education without inferring other skills", () => {
  const data = fixture();
  const defaults = getDefaultCVSelection(data.profile, data.job);
  assert.ok(defaults.evidence.some((link) => linkKey(link) === linkKey(data.link)));
  assert.ok(defaults.evidence.some((link) => link.recordType === "education"));
  assert.ok(defaults.evidence.every((link) => link.recordType === "education" || linkKey(link) === linkKey(data.link)));
  const candidates = getCVCandidates(data.profile, data.job);
  assert.equal(candidates[0].matchedRequirementLabels[0], "Design experiments");
  const noLinks = structuredClone(data.job);
  noLinks.requirements[0].profileMatches = [];
  assert.ok(getCVCandidates(data.profile, noLinks).every((candidate) => candidate.matchedRequirementLabels.length === 0));
});

test("skills require their own verification and verified linked proof", () => {
  const data = fixture();
  const skill = data.profile.skills[0];
  data.selection.skillIds = [skill.id];
  const content = buildCVContent(data.profile, data.selection);
  assert.ok(content);
  assert.equal(content.skills[0].name, skill.name);
  assert.ok(content.skills[0].evidence.length > 0);
  skill.verificationStatus = "needs_confirmation";
  assert.equal(buildCVContent(data.profile, data.selection), null);
  assert.equal(getCVCandidates(data.profile, data.job).some((candidate) => candidate.skillId === skill.id), false);
});

test("a verified skill with only pending proof cannot be exported", () => {
  const data = fixture();
  const skill = data.profile.skills[0];
  skill.evidenceLinks = [data.link];
  data.profile.experiences.forEach((record) => { record.skillIds = []; });
  data.profile.researchProjects.forEach((record) => { record.skillIds = []; });
  data.profile.careerStories.forEach((record) => { record.skillIds = []; });
  data.claim.verificationStatus = "draft";
  assert.equal(getCVCandidates(data.profile, data.job).some((candidate) => candidate.skillId === skill.id), false);
});

test("an archive includes skill proof outside visible sections and reproduces it after reload", () => {
  const data = fixture();
  data.selection.skillIds = [data.profile.skills[0].id];
  const result = createCVVersion({ id: "v", ...data, status: "reviewed", now });
  assert.ok(result);
  assert.deepEqual(normalizeCVVersions(JSON.parse(JSON.stringify([result])), data.application), [result]);
  assert.ok(result.content.skills[0].evidence.every((link) => result.sourceProfile.experiences.some((record) => record.id === link.recordId)
    || result.sourceProfile.researchProjects.some((record) => record.id === link.recordId) || result.sourceProfile.careerStories.some((record) => record.id === link.recordId)));
});

test("record-level experience without a summary retains its displayed verified fallback claim", () => {
  const data = fixture();
  delete data.experience.summary;
  data.selection.evidence = [{ recordType: "experience", recordId: data.experience.id }];
  const result = createCVVersion({ id: "v", ...data, status: "reviewed", now });
  assert.ok(result);
  const candidate = getCVCandidates(data.profile, data.job).find((item) => item.id === linkKey(data.selection.evidence[0]));
  assert.equal(candidate?.text, data.claim.text);
  assert.deepEqual(result.content.sections[0].entries[0].paragraphs, [data.claim.text]);
  assert.deepEqual(result.sourceProfile.experiences[0].responsibilities, [data.claim]);
  assert.deepEqual(normalizeCVVersions([result], data.application), [result]);
  data.claim.verificationStatus = "draft";
  assert.equal(isCVVersionStale(result, data.profile), true);
});

test("selection order controls entry and bullet order while never changing factual wording", () => {
  const data = fixture();
  const second = data.experience.responsibilities[1];
  const other = data.profile.experiences[1];
  data.selection.evidence = [{ recordType: "experience", recordId: other.id },
    { recordType: "experience", recordId: data.experience.id, claimId: second.id }, data.link];
  const result = buildCVContent(data.profile, data.selection);
  assert.ok(result);
  assert.equal(result.sections[0].entries[0].title, other.title);
  assert.deepEqual(result.sections[0].entries[1].bullets, [second.text, data.claim.text]);
});

test("education, projects, achievements and career stories retain exact verified facts", () => {
  const data = fixture();
  const meta = { source: "user" as const, verificationStatus: "verified" as const, createdAt: now, updatedAt: now };
  data.profile.achievements.push({ ...meta, id: "metric", title: "Calibration", description: "Measured device repeatability.",
    metric: { value: "7.25%", context: "Relative variation in the recorded runs." }, date: "2025" });
  data.selection.evidence = [{ recordType: "education", recordId: data.profile.education[0].id },
    { recordType: "research_project", recordId: data.profile.researchProjects[0].id },
    { recordType: "achievement", recordId: "metric" }, { recordType: "career_story", recordId: data.profile.careerStories[0].id }];
  const result = buildCVContent(data.profile, data.selection);
  assert.ok(result);
  assert.equal(result.sections.length, 4);
  assert.equal(result.sections[0].entries[0].subtitle, data.profile.education[0].institution);
  assert.ok(result.sections[1].entries[0].paragraphs.includes(data.profile.researchProjects[0].objective!));
  assert.ok(result.sections[2].entries[0].paragraphs.includes("7.25%"));
  assert.deepEqual(result.sections[3].entries[0].bullets, data.profile.careerStories[0].actions);
});

test("a verified name and at least one evidence section are required", () => {
  const data = fixture();
  data.profile.personal.verificationStatus = "draft";
  assert.equal(buildCVContent(data.profile, data.selection), null);
  data.profile.personal.verificationStatus = "verified";
  data.profile.personal.name = " ";
  assert.equal(buildCVContent(data.profile, data.selection), null);
  data.profile.personal.name = "Candidate";
  assert.equal(buildCVContent(data.profile, { evidence: [], skillIds: [data.profile.skills[0].id] }), null);
});

test("duplicate and dangling selections are rejected instead of silently repaired", () => {
  const data = fixture();
  assert.equal(buildCVContent(data.profile, { evidence: [data.link, data.link], skillIds: [] }), null);
  assert.equal(buildCVContent(data.profile, { evidence: [{ ...data.link, claimId: "gone" }], skillIds: [] }), null);
  assert.equal(buildCVContent(data.profile, { evidence: [{ ...data.link, recordId: "gone" }], skillIds: [] }), null);
  assert.equal(buildCVContent(data.profile, { evidence: [data.link], skillIds: ["gone"] }), null);
  assert.equal(buildCVContent(data.profile, { evidence: [data.link], skillIds: [data.profile.skills[0].id, data.profile.skills[0].id] }), null);
});

test("factories and selectors do not mutate or freeze caller-owned objects", () => {
  const data = fixture();
  const before = structuredClone(data);
  getCVCandidates(data.profile, data.job);
  getDefaultCVSelection(data.profile, data.job);
  const result = createCVVersion({ id: "v", ...data, status: "reviewed", now });
  assert.ok(result);
  assert.deepEqual(data, before);
  data.claim.text = "Later corrected statement";
  data.selection.evidence.push({ recordType: "education", recordId: data.profile.education[0].id });
  assert.equal(result.content.sections[0].entries[0].bullets[0], before.claim.text);
  assert.equal(result.selection.evidence.length, 1);
});

test("job requirements, scores, overrides, preferences and eligibility never become CV facts", () => {
  const data = fixture();
  Object.assign(data.job.requirements[0], { userOverride: { note: "WHAT IF INVENTION", confirmed: true } });
  data.profile.preferences.targetRoles = ["WISHED FOR JOB"];
  const result = createCVVersion({ id: "v", ...data, status: "reviewed", now });
  assert.ok(result);
  assert.doesNotMatch(JSON.stringify(result.content), /Research Engineer|Evidence Lab|WHAT IF INVENTION|WISHED FOR JOB|sponsorship|overallFit/);
  assert.deepEqual(result.sourceProfile.workAuthorizations, []);
  assert.deepEqual(result.sourceProfile.preferences.targetRoles, []);
});

test("modified CV wording, sources, verification and provenance fail persistence validation", () => {
  const data = version();
  const mutations = [
    (value: typeof data.version) => { value.content.sections[0].entries[0].bullets[0] = "Fabricated publication"; },
    (value: typeof data.version) => { value.sourceProfile.experiences[0].responsibilities[0].verificationStatus = "draft"; },
    (value: typeof data.version) => { value.sourceProfile.experiences[0].verificationStatus = "needs_confirmation"; },
    (value: typeof data.version) => { value.sourceProfile.experiences[0].responsibilities[0].sourceRecordId = "tampered"; },
    (value: typeof data.version) => { value.profileRevision = "forged-revision"; },
    (value: typeof data.version) => { value.sourceProfile.preferences.targetRoles = ["unrelated stored prose"]; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(data.version);
    mutate(value);
    assert.equal(normalizeCVVersions([value], data.application), null);
  }
});

test("unsupported schemas, identities, duplicate IDs and invalid dates fail safely", () => {
  const data = version();
  for (const change of [{ schemaVersion: 2 }, { applicationId: "foreign" }, { profileId: "foreign" }, { jobId: "foreign" },
    { company: "foreign" }, { status: "complete" }, { createdAt: "garbage" }, { createdAt: "2026-10-13" }]) {
    assert.equal(normalizeCVVersions([{ ...data.version, ...change }], data.application), null);
  }
  assert.equal(normalizeCVVersions([data.version, data.version], data.application), null);
  const older = createCVVersion({ id: "older", ...data, status: "draft", now: "2026-10-12T12:00:00.000Z" });
  assert.ok(older);
  assert.equal(normalizeCVVersions([data.version, older], data.application), null);
  assert.deepEqual(normalizeCVVersions([], data.application), []);
});

test("source corrections, deleted evidence and withdrawn verification make saved CVs stale", () => {
  for (const change of [
    (data: ReturnType<typeof version>) => { data.claim.text = "Corrected facts"; },
    (data: ReturnType<typeof version>) => { data.experience.organization = "Correct employer"; },
    (data: ReturnType<typeof version>) => { data.claim.verificationStatus = "draft"; },
    (data: ReturnType<typeof version>) => { data.profile.experiences = []; },
    (data: ReturnType<typeof version>) => { data.profile.personal.email = "updated@example.com"; },
  ]) {
    const data = version();
    assert.equal(isCVVersionStale(data.version, data.profile), false);
    change(data);
    assert.equal(isCVVersionStale(data.version, data.profile), true);
    assert.ok(normalizeCVVersions([data.version], data.application), "History remains valid after a live Profile correction");
  }
});

test("draft and reviewed histories append without promoting earlier versions", () => {
  const data = version("draft");
  const reviewed = createCVVersion({ id: "cv-two", ...data, status: "reviewed", now: "2026-10-13T13:00:00.000Z" });
  assert.ok(reviewed);
  assert.equal(data.version.status, "draft");
  assert.deepEqual(normalizeCVVersions([data.version, reviewed], data.application), [data.version, reviewed]);
  assert.equal(isCVVersionStale(reviewed, { ...data.profile, id: "another-profile" }), true);
});

test("arbitrary unconfirmed or unsupported source payloads are rejected without acquiring verification", () => {
  const data = version();
  const archive = structuredClone(data.version);
  archive.sourceProfile.experiences.push({ ...data.profile.experiences[1], verificationStatus: "draft", summary: "SECRET IMPORT" });
  assert.equal(normalizeCVVersions([archive], data.application), null);
  assert.equal(createCVVersion({ id: "foreign", ...data, application: { ...data.application, profileId: "foreign" }, status: "reviewed", now }), null);
  assert.equal(createCVVersion({ id: "bad-date", ...data, status: "reviewed", now: "garbage" }), null);
});
