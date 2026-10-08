import assert from "node:assert/strict";
import type { JobRequirement } from "@/types/analysis";
import {
  calculateFit,
  evaluateCriticalRequirements,
} from "./scoring";
import { determineRecommendation } from "./recommendation";
import { buildJobAnalysis } from "./mock-engine";
import { hamiltonJob } from "./mock-hamilton";
import { createDemoProfile } from "../profile/mock-profile";

console.log("── Running Bámi Apply Scoring Engine Test Suite ──");

// ── Case 1: High fit + no blockers → Strong Apply ────────────────────────────
{
  const requirements: JobRequirement[] = [
    {
      id: "c1",
      label: "Clinical Trial Protocol",
      importance: "core",
      category: "experience",
      evidenceStrength: "strong",
    },
    {
      id: "c2",
      label: "Quantitative Analysis",
      importance: "core",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "p1",
      label: "EDC Systems",
      importance: "preferred",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "crit1",
      label: "Work Authorization",
      importance: "critical",
      category: "work_authorization",
      evidenceStrength: "strong",
      criticalStatus: "satisfied",
    },
  ];

  const metrics = calculateFit(requirements);
  const critical = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, critical, requirements);

  assert.equal(metrics.overallFit, 100);
  assert.equal(outcome.recommendation, "Strong Apply");
  assert.equal(metrics.confidence, "High");
  console.log("✓ Case 1 passed: High fit + no blockers → Strong Apply (100% fit, High confidence)");
}

// ── Case 2: Good fit + several minor gaps → Apply ────────────────────────────
{
  const requirements: JobRequirement[] = [
    {
      id: "c1",
      label: "Core Task A",
      importance: "core",
      category: "experience",
      evidenceStrength: "strong",
    },
    {
      id: "c2",
      label: "Core Task B",
      importance: "core",
      category: "experience",
      evidenceStrength: "partial",
    },
    {
      id: "p1",
      label: "Pref Tool",
      importance: "preferred",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "k1",
      label: "Context Factor",
      importance: "contextual",
      category: "industry",
      evidenceStrength: "none",
    },
  ];

  const metrics = calculateFit(requirements);
  const critical = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, critical, requirements);

  assert.ok(metrics.overallFit >= 65);
  assert.equal(outcome.recommendation, "Apply");
  console.log(`✓ Case 2 passed: Good fit with minor gaps (${metrics.overallFit}% fit → Apply)`);
}

// ── Case 3: Moderate fit (45%–64%) → Stretch ─────────────────────────────────
{
  const requirements: JobRequirement[] = [
    {
      id: "c1",
      label: "Core Task A",
      importance: "core",
      category: "experience",
      evidenceStrength: "partial",
    },
    {
      id: "c2",
      label: "Core Task B",
      importance: "core",
      category: "experience",
      evidenceStrength: "partial",
    },
    {
      id: "p1",
      label: "Preferred X",
      importance: "preferred",
      category: "skill",
      evidenceStrength: "partial",
    },
  ];

  const metrics = calculateFit(requirements);
  const critical = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, critical, requirements);

  assert.ok(metrics.overallFit >= 45 && metrics.overallFit < 65);
  assert.equal(outcome.recommendation, "Stretch");
  console.log(`✓ Case 3 passed: Moderate fit (${metrics.overallFit}% fit → Stretch)`);
}

// ── Case 4: Very low fit (<45% or core <40%) → Skip ──────────────────────────
{
  const requirements: JobRequirement[] = [
    {
      id: "c1",
      label: "Core Task A",
      importance: "core",
      category: "experience",
      evidenceStrength: "none",
    },
    {
      id: "c2",
      label: "Core Task B",
      importance: "core",
      category: "experience",
      evidenceStrength: "none",
    },
    {
      id: "p1",
      label: "Preferred X",
      importance: "preferred",
      category: "skill",
      evidenceStrength: "partial",
    },
  ];

  const metrics = calculateFit(requirements);
  const critical = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, critical, requirements);

  assert.ok(metrics.overallFit < 45);
  assert.equal(outcome.recommendation, "Skip");
  console.log(`✓ Case 4 passed: Very low fit (${metrics.overallFit}% fit, Core ${metrics.coreFit}% → Skip)`);
}

// ── Case 5: 90%+ fit + confirmed hard blocker → Skip ─────────────────────────
{
  const requirements: JobRequirement[] = [
    {
      id: "c1",
      label: "Core Skill A",
      importance: "core",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "c2",
      label: "Core Skill B",
      importance: "core",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "crit-block",
      label: "Mandatory Medical License",
      importance: "critical",
      category: "license",
      evidenceStrength: "none",
      criticalStatus: "unmet",
      isHardBlocker: true,
      rationale: "Requires active Swiss Medical Board license.",
    },
  ];

  const metrics = calculateFit(requirements);
  const critical = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, critical, requirements);

  assert.equal(metrics.overallFit, 100);
  assert.equal(outcome.recommendation, "Skip");
  assert.ok(outcome.recommendationReason.includes("Mandatory Medical License"));
  console.log("✓ Case 5 passed: 100% fit + confirmed hard blocker → Skip (non-negotiable gate enforced)");
}

// ── Case 6: 90%+ fit + unresolved critical requirement → Capped (Stretch) ────
{
  const requirements: JobRequirement[] = [
    {
      id: "c1",
      label: "Core Skill A",
      importance: "core",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "c2",
      label: "Core Skill B",
      importance: "core",
      category: "skill",
      evidenceStrength: "strong",
    },
    {
      id: "crit-unknown",
      label: "Swiss Work Authorization",
      importance: "critical",
      category: "work_authorization",
      evidenceStrength: "needs_confirmation",
      criticalStatus: "needs_confirmation",
      isHardBlocker: true,
    },
  ];

  const metrics = calculateFit(requirements);
  const critical = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, critical, requirements);

  assert.equal(metrics.overallFit, 100);
  assert.notEqual(outcome.recommendation, "Strong Apply");
  assert.equal(outcome.recommendation, "Stretch");
  assert.equal(metrics.confidence, "Medium");
  assert.ok(outcome.recommendationReason.includes("Swiss Work Authorization"));
  console.log("✓ Case 6 passed: 100% fit + unconfirmed critical gate → Capped at Stretch with warning");
}

// ── Case 7: Needs-confirmation exclusion & confidence impact ──────────────────
{
  const reqWithNone: JobRequirement[] = [
    { id: "1", label: "A", importance: "core", category: "skill", evidenceStrength: "strong" },
    { id: "2", label: "B", importance: "core", category: "skill", evidenceStrength: "none" },
    { id: "3", label: "C", importance: "core", category: "skill", evidenceStrength: "strong" },
    { id: "4", label: "D", importance: "core", category: "skill", evidenceStrength: "strong" },
    { id: "5", label: "E", importance: "core", category: "skill", evidenceStrength: "strong" },
  ];
  const reqWithNeedsConf: JobRequirement[] = [
    { id: "1", label: "A", importance: "core", category: "skill", evidenceStrength: "strong" },
    { id: "2", label: "B", importance: "core", category: "skill", evidenceStrength: "needs_confirmation" },
    { id: "3", label: "C", importance: "core", category: "skill", evidenceStrength: "strong" },
    { id: "4", label: "D", importance: "core", category: "skill", evidenceStrength: "strong" },
    { id: "5", label: "E", importance: "core", category: "skill", evidenceStrength: "strong" },
  ];

  const fitNone = calculateFit(reqWithNone);
  const fitNeedsConf = calculateFit(reqWithNeedsConf);

  // 'none' penalizes score (4 strong out of 5 = 80%)
  assert.equal(fitNone.overallFit, 80);
  assert.equal(fitNone.confidence, "High");

  // 'needs_confirmation' does NOT penalize denominator (4 strong out of 4 scorable = 100%)
  assert.equal(fitNeedsConf.overallFit, 100);
  assert.equal(fitNeedsConf.confidence, "Medium");
  console.log("✓ Case 7 passed: 'needs_confirmation' does not penalize score denominator, but reduces confidence");
}

// ── Case 8: Hamilton Medical Real Profile Verification ───────────────────────
{
  const profile = createDemoProfile();
  const initialHamilton = buildJobAnalysis({ profile, job: hamiltonJob });
  assert.equal(initialHamilton.overallFit, 63);
  assert.equal(initialHamilton.coreFit, 75);
  assert.equal(initialHamilton.preferredFit, 13);
  assert.equal(initialHamilton.contextualFit, 75);
  // Initial state has Swiss work auth as needs_confirmation -> Stretch with Medium confidence
  assert.equal(initialHamilton.recommendation, "Stretch");
  assert.equal(initialHamilton.confidence, "Medium");

  // When user confirms authorization:
  const confirmedHamilton = buildJobAnalysis({
    profile,
    job: hamiltonJob,
    overrides: { "req-crit-1": { action: "satisfy" } },
  });
  assert.equal(confirmedHamilton.overallFit, 63);
  assert.equal(confirmedHamilton.recommendation, "Stretch");
  assert.equal(confirmedHamilton.confidence, "High");

  // When user blocks authorization (hard blocker):
  const blockedHamilton = buildJobAnalysis({
    profile,
    job: hamiltonJob,
    overrides: { "req-crit-1": { action: "block" } },
  });
  assert.equal(blockedHamilton.recommendation, "Skip");
  console.log("✓ Case 8 passed: Hamilton Medical derives honest 63% fit from Career Profile, reacting to critical gates");
}

console.log("\n✨ All 8 test suites passed with 0 errors!");
