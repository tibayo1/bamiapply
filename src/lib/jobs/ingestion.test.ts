import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { createApplicationRecord, normalizeApplications } from "@/lib/applications/domain";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import type { JobDraftInput } from "@/types/job";
import { createRequirementDraft, getJobEvidenceOptions, MAX_JOB_DESCRIPTION_LENGTH, reviewJobInput, suggestJobRequirements, suggestJobRequirementsDetailed } from "./ingestion";

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

const clinicalDescription = `Clinical Evidence Lead
About us
We are an innovative company improving patient lives.
Job Responsibilities
- Owns and drives end-to-end clinical evidence strategy, defining and linking clinical need, value, TPP, claims, endpoints, and evidence to regulatory acceptance.
- Leads clinical development in cross-functional AD and PDLM core teams and drives program governance and cross-project integration.
- Oversees clinical trials, protocol development and trial registration.
Minimum Qualifications
- At least 5 years of clinical development experience in medical devices is required.
- A Master's degree or equivalent experience in life sciences is required.
- Must hold a current professional nursing license.
Preferred Qualifications
- Experience with real-world evidence.
- PhD preferred.
Work arrangements
- Travel up to 20% is required.
Eligibility
- Must be authorized to work in Switzerland; visa sponsorship is not available.
Benefits
- We offer flexible hours, pension contributions and a generous holiday allowance.
How to apply
- Submit your resume and a cover letter through our careers page.`;

test("clinical postings become assessable capabilities without scoring headings or marketing text", () => {
  const requirements = suggestJobRequirements(clinicalDescription);
  assert.equal(requirements.length, 10);
  assert.equal(requirements[0].label, "Clinical evidence strategy · regulatory acceptance");
  assert.equal(requirements[1].label, "Clinical development · program governance");
  assert.ok(requirements.slice(0, 3).every((requirement) => requirement.category === "experience"));
  assert.equal(requirements.find((requirement) => /trial registration/.test(requirement.sourceText))!.category, "experience");
  assert.equal(requirements.filter((requirement) => requirement.importance === "critical").length, 2);
  assert.equal(requirements.filter((requirement) => requirement.importance === "preferred").length, 2);
  assert.equal(requirements.find((requirement) => /Travel/.test(requirement.sourceText))!.importance, "contextual");
  for (const requirement of requirements) {
    assert.ok(clinicalDescription.includes(requirement.sourceText));
    assert.deepEqual(requirement.profileMatches, []);
    assert.doesNotMatch(requirement.sourceText, /^Job Responsibilities$|innovative company|pension contributions|Submit your resume/);
  }
});

test("numeric qualifications and degree alternatives retain their conditions", () => {
  const requirements = suggestJobRequirements(clinicalDescription);
  const experience = requirements.find((requirement) => requirement.sourceText.includes("At least 5 years"))!;
  const education = requirements.find((requirement) => requirement.sourceText.includes("degree or equivalent"))!;
  assert.equal(experience.label, experience.sourceText);
  assert.equal(education.label, education.sourceText);
  assert.equal(education.category, "education");
});

test("preferred sections apply until the next heading and required wording can override them", () => {
  const requirements = suggestJobRequirements("Preferred Qualifications:\n- Experience with Python.\n- Must have clinical research experience.\nJob Responsibilities:\n- Design research studies.");
  assert.equal(requirements.length, 3);
  assert.equal(requirements[0].importance, "preferred");
  assert.equal(requirements[1].importance, "core");
  assert.equal(requirements[2].importance, "core");
});

test("benefit and application sections stay excluded through their bullets and paragraphs", () => {
  const requirements = suggestJobRequirements("Benefits\n- We offer remote working and travel discounts.\nAnnual leave includes 30 days.\nHow to apply\nYou must submit your CV.\nRequired Qualifications\nExperience with Python.");
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].sourceText, "Experience with Python.");
});

test("wrapped CRLF bullets retain a verbatim source span and abbreviations stay intact", () => {
  const source = "Job Responsibilities:\r\n• Owns clinical evidence strategy,\r\n  linking endpoints to regulatory acceptance.\r\nMinimum Qualifications:\r\n• B.Sc. or Ph.D. in life sciences is required.\r\n• At least 2.5 years of experience is required.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 3);
  assert.equal(requirements[0].sourceText, "Owns clinical evidence strategy,\r\n  linking endpoints to regulatory acceptance.");
  assert.ok(requirements[1].sourceText.includes("B.Sc. or Ph.D."));
  assert.ok(requirements[2].label.includes("2.5 years"));
  assert.ok(requirements.every((requirement) => source.includes(requirement.sourceText)));
});

test("identical repeated wording is deduplicated without merging distinct clinical duties", () => {
  const source = "Job Responsibilities\n- Design clinical studies.\n- design clinical studies\n- Design clinical trials for medical devices.\n- Develop clinical evidence strategy.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 3);
  assert.ok(requirements.some((requirement) => requirement.sourceText.includes("clinical trials for medical devices")));
  assert.ok(requirements.some((requirement) => requirement.sourceText.includes("clinical evidence strategy")));
});

test("unnecessary qualifications and clinical trial registration never create a license blocker", () => {
  const source = "Qualifications\n- No nursing license required.\n- No previous experience is required.\n- A professional nursing license is preferred.\nResponsibilities\n- Manage clinical trial registration.\n- Must be eligible for promotion.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 3);
  assert.equal(requirements.find((requirement) => requirement.category === "license")!.importance, "preferred");
  assert.equal(requirements.filter((requirement) => requirement.importance === "critical").length, 0);
});

test("overflow is visible and a late mandatory authorization survives the 30-item limit", () => {
  const source = Array.from({ length: 40 }, (_, index) => `Design experiment number ${index} carefully`).join("\n")
    + "\nMust have authorization to work in Switzerland.";
  const result = suggestJobRequirementsDetailed(source);
  assert.equal(result.totalSuggestions, 41);
  assert.equal(result.omittedCount, 11);
  assert.equal(result.requirements.length, 30);
  assert.ok(result.requirements.some((requirement) => requirement.category === "work_authorization" && requirement.importance === "critical"));
  assert.ok(result.requirements.every((requirement) => source.includes(requirement.sourceText)));
});

test("a negated license in a compound requirement does not create a hard gate", () => {
  const source = "Requirements:\nNo medical license is required, but clinical research experience is essential.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].category, "experience");
  assert.equal(requirements[0].importance, "core");
  assert.equal(requirements[0].isHardBlocker, false);
  assert.ok(requirements[0].label.includes("No medical license is required"));
});

test("an unequivocal license to practise requirement becomes a separate critical gate", () => {
  for (const source of ["Must hold a license to practice medicine.", "You must be licensed to practice medicine."]) {
    const requirements = suggestJobRequirements(source);
    assert.equal(requirements.length, 1);
    assert.equal(requirements[0].category, "license");
    assert.equal(requirements[0].importance, "critical");
    assert.equal(requirements[0].sourceText, source);
  }
});

test("separate degree and license lines beginning with an article do not merge", () => {
  const source = "Required qualifications\nA degree in medicine\nA current professional nursing license is required";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 2);
  assert.equal(requirements[0].category, "education");
  assert.equal(requirements[1].category, "license");
  assert.ok(requirements.every((requirement) => source.includes(requirement.sourceText)));
});

test("indented required-for wording continues the responsibility instead of becoming an orphan", () => {
  const source = "Responsibilities:\n- Lead clinical evidence strategy\n  and develop study protocols\n  required for regulatory acceptance.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].sourceText, "Lead clinical evidence strategy\n  and develop study protocols\n  required for regulatory acceptance.");
});

test("medical degree abbreviations do not split a qualification", () => {
  const source = "Requirements:\n- An M.D. Degree is required.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].category, "education");
  assert.equal(requirements[0].sourceText, "An M.D. Degree is required.");
});

test("a negated authorization inside a research condition does not create an eligibility gate", () => {
  const source = "Requirements:\nNo work authorization is required, but clinical research experience is essential.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].category, "experience");
  assert.equal(requirements[0].importance, "core");
  assert.equal(requirements[0].isHardBlocker, false);
});

test("standalone employer sponsorship policies do not lower the scored candidate match", () => {
  const source = "Requirements:\n- Design clinical experiments.\n- Visa sponsorship is not available.";
  const requirements = suggestJobRequirements(source);
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].sourceText, "Design clinical experiments.");
});
