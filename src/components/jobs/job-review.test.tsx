import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { JobInput } from "@/components/dashboard/JobInput";
import { JobsProvider } from "@/lib/jobs/context";
import { createRequirementDraft, getJobEvidenceOptions } from "@/lib/jobs/ingestion";
import { ProfileProvider } from "@/lib/profile/context";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { JobRequirementEditor } from "./JobRequirementEditor";

test("the importer waits for hydration without presenting demo facts as candidate evidence", () => {
  const router: AppRouterInstance = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "job-review-hydration" };
  const html = renderToStaticMarkup(
    <AppRouterContext value={router}>
      <ProfileProvider><JobsProvider><JobInput /></JobsProvider></ProfileProvider>
    </AppRouterContext>
  );
  assert.match(html, /Loading your Career Profile and reviewed jobs/);
  assert.match(html, /<fieldset disabled=""/);
  assert.match(html, /Open sample analysis/);
  assert.doesNotMatch(html, /Designed haptic psychophysics|your reviewed jobs|Link verified Profile evidence|Vibrotactile/);
});

test("the reviewer displays exact selected verified excerpts with explicit relevance", () => {
  const profile = createDemoProfile();
  const evidence = getJobEvidenceOptions(profile);
  const selected = evidence.find((item) => item.claim);
  assert.ok(selected);
  const requirement = { ...createRequirementDraft("reviewed-requirement"), label: "Design research studies", sourceText: "Design research studies for the team.", profileMatches: [{ link: selected.link, relevance: "adjacent" as const }] };
  const html = renderToStaticMarkup(<JobRequirementEditor requirement={requirement} index={0} evidenceOptions={evidence} onChange={() => {}} onRemove={() => {}} />);
  assert.ok(html.includes(selected.excerpt));
  assert.match(html, /option value="adjacent" selected=""/);
  assert.match(html, /View source in Career Profile/);
  assert.match(html, /Direct or adjacent describes your assessment/);
  assert.doesNotMatch(html, /type="text"[^>]*value="Designed haptic psychophysics/);
});

test("a selected link that is no longer verified prompts review rather than displaying a claim", () => {
  const profile = createDemoProfile();
  const selected = getJobEvidenceOptions(profile).find((item) => item.claim);
  assert.ok(selected);
  const requirement = { ...createRequirementDraft("stale-evidence"), label: "Research experience", sourceText: "Research experience required.", profileMatches: [{ link: selected.link, relevance: "direct" as const }] };
  const html = renderToStaticMarkup(<JobRequirementEditor requirement={requirement} index={0} evidenceOptions={[]} onChange={() => {}} onRemove={() => {}} />);
  assert.match(html, /no longer verified or available/);
  assert.doesNotMatch(html, new RegExp(selected.excerpt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("critical work authorization records employer conditions without treating unknown sponsorship as unavailable", () => {
  const requirement = { ...createRequirementDraft("authorization-gate"), label: "Right to work", sourceText: "Applicants must have the right to work in the UK.", category: "work_authorization" as const, importance: "critical" as const, isHardBlocker: true, acceptedRegions: "United Kingdom" };
  const html = renderToStaticMarkup(<JobRequirementEditor requirement={requirement} index={1} evidenceOptions={getJobEvidenceOptions(createDemoProfile())} onChange={() => {}} onRemove={() => {}} />);
  assert.match(html, /Critical requirements are checked separately/);
  assert.match(html, /value="unknown" selected=""/);
  assert.match(html, /Not stated \/ needs confirmation/);
  assert.match(html, /Your work authorization is read from your Career Profile/);
  assert.doesNotMatch(html, /Link verified Profile evidence|Designed haptic psychophysics/);
});
