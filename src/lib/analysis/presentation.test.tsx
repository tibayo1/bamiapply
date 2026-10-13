import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchSummary } from "@/components/analysis/MatchSummary";
import { CriticalChecks } from "@/components/analysis/CriticalChecks";
import { RequirementEvidenceList, RequirementRow } from "@/components/analysis/RequirementRow";
import { StrengthsSection } from "@/components/analysis/StrengthsSection";
import { TooltipProvider } from "@/components/ui/Tooltip";
import type { CandidateEvidence, CriticalIssue, JobRequirement } from "@/types/analysis";
import { createDemoProfile } from "../profile/mock-profile";
import { buildJobAnalysis } from "./mock-engine";
import { hamiltonJob } from "./mock-hamilton";
import { applyOverrides } from "./overrides";
import { getVerifiedCoreStrengths, isVerifiedProfileEvidence, summarizeEligibility } from "./presentation";

function evidence(id: string, status: CandidateEvidence["status"]): CandidateEvidence {
  return {
    id,
    sourceType: "experience",
    sourceTitle: "Research assistant",
    evidenceText: `${id} evidence statement`,
    strength: "strong",
    status,
    link: { recordType: "experience", recordId: "experience-1", claimId: id },
  };
}

function requirement(items: CandidateEvidence[]): JobRequirement {
  return {
    id: "core-1",
    label: "Trial coordination",
    importance: "core",
    category: "experience",
    evidenceStrength: "strong",
    evidence: items,
  };
}

function critical(status: CriticalIssue["status"]): CriticalIssue {
  return {
    id: `gate-${status}`,
    requirementId: `requirement-${status}`,
    label: "Eligibility requirement",
    category: "work_authorization",
    status,
    isHardBlocker: true,
    message: "Eligibility assessment",
  };
}

function renderSummary(analysis: ReturnType<typeof buildJobAnalysis>) {
  return renderToStaticMarkup(<TooltipProvider><MatchSummary analysis={analysis} /></TooltipProvider>);
}

test("a confirmed unmet gate stays unmet in the recommendation and summary", () => {
  const analysis = buildJobAnalysis({
    profile: createDemoProfile(),
    job: hamiltonJob,
    overrides: { "req-crit-1": { action: "block" } },
  });
  assert.equal(analysis.recommendation, "Skip");
  const html = renderSummary(analysis);
  assert.match(html, /1 unmet/);
  assert.doesNotMatch(html, />Satisfied</);
  assert.match(html, /self-reported overrides affect this analysis only/);
  assert.match(html, /Assessment coverage including overrides/);
});

test("the gate summary counts satisfied, unmet, and pending evaluated gates", () => {
  const criticalIssues = [critical("satisfied"), critical("unmet"), critical("needs_confirmation")];
  assert.deepEqual(summarizeEligibility(criticalIssues), { total: 3, satisfied: 1, unmet: 1, pending: 1 });
  const analysis = buildJobAnalysis({ profile: createDemoProfile(), job: hamiltonJob });
  assert.match(renderSummary({ ...analysis, criticalIssues }), /1 satisfied · 1 unmet · 1 unconfirmed/);
  assert.doesNotMatch(renderSummary({ ...analysis, criticalIssues: [] }), />Satisfied</);
  assert.match(renderSummary({ ...analysis, criticalIssues: [] }), /No critical requirements identified/);
});

test("evidence drawers distinguish verified, draft, pending, and unverified items", () => {
  const items = [
    evidence("draft", "draft"),
    evidence("pending", "needs_confirmation"),
    evidence("verified", "verified"),
    evidence("unknown", undefined),
    { ...evidence("unlinked", "verified"), link: undefined },
  ];
  const html = renderToStaticMarkup(<RequirementEvidenceList evidence={items} />);
  assert.match(html, /Draft · not scored/);
  assert.match(html, /Needs confirmation · not scored/);
  assert.equal((html.match(/>Verified</g) ?? []).length, 1);
  assert.equal((html.match(/>Unverified · not scored</g) ?? []).length, 2);
  assert.doesNotMatch(html, /Verified evidence from/);
  assert.equal(isVerifiedProfileEvidence(items[4]), false);
});

test("strengths select verified direct evidence after draft and adjacent items", () => {
  const items = [
    evidence("draft-first", "draft"),
    { ...evidence("adjacent", "verified"), strength: "partial" as const },
    evidence("verified-direct", "verified"),
  ];
  const requirements = [requirement(items)];
  assert.equal(getVerifiedCoreStrengths(requirements)[0].evidence.id, "verified-direct");
  const html = renderToStaticMarkup(<StrengthsSection requirements={requirements} />);
  assert.match(html, /1 verified proof points/);
  assert.match(html, /verified-direct evidence statement/);
  assert.doesNotMatch(html, /draft-first evidence statement|adjacent evidence statement/);
});

test("self-reported overrides cannot become verified proof points", () => {
  const requirements = applyOverrides([
    { ...requirement([evidence("draft", "draft")]), evidenceStrength: "needs_confirmation" },
  ], { "core-1": { action: "confirm_experience", note: "I have this background." } });
  assert.deepEqual(getVerifiedCoreStrengths(requirements), []);
  assert.equal(renderToStaticMarkup(<StrengthsSection requirements={requirements} />), "");
  const html = renderToStaticMarkup(<RequirementRow requirement={requirements[0]} />);
  assert.match(html, /Self-reported match/);
  assert.match(html, /What-if assessment · Career Profile unchanged/);
  assert.doesNotMatch(html, /Strong Match/);
});

test("unlinked or unverified display data cannot support proven strengths", () => {
  const requirements = [requirement([
    evidence("unknown", undefined),
    { ...evidence("unlinked", "verified"), link: undefined },
  ])];
  assert.equal(renderToStaticMarkup(<StrengthsSection requirements={requirements} />), "");
});

test("overrides preserve existing verified proof without replacing it with a local note", () => {
  const requirements = applyOverrides([requirement([evidence("verified-direct", "verified")])], {
    "core-1": { action: "confirm_experience", note: "Additional self-reported claim" },
  });
  const html = renderToStaticMarkup(<StrengthsSection requirements={requirements} />);
  assert.match(html, /verified-direct evidence statement/);
  assert.doesNotMatch(html, /Additional self-reported claim/);
});

test("eligibility controls describe self-reported determinations without claiming Profile verification", () => {
  const html = renderToStaticMarkup(<CriticalChecks
    issues={[{ ...critical("satisfied"), message: "Verified: Eligibility requirement is satisfied." }]}
    onResolve={() => {}}
  />);
  assert.match(html, /self-reported what-if overrides for this analysis/);
  assert.match(html, /They do not update or verify your Career Profile/);
  assert.match(html, /Eligibility assessed as satisfied for this analysis/);
  assert.doesNotMatch(html, /Verified:/);
});

test("non-authorization gates use requirement wording instead of visa-specific choices", () => {
  const html = renderToStaticMarkup(<CriticalChecks
    issues={[{ ...critical("needs_confirmation"), category: "license", label: "Mandatory professional license" }]}
    onResolve={() => {}}
  />);
  assert.match(html, /I meet this requirement/);
  assert.match(html, /I do not meet this requirement/);
  assert.doesNotMatch(html, /I have authorization|I need sponsorship/);
});
