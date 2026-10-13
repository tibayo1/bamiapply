import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { JobAnalysisView } from "@/components/analysis/JobAnalysisView";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { ApplicationsProvider } from "@/lib/applications/context";
import { createApplicationRecord, getLatestSnapshot, refreshApplicationRecord } from "@/lib/applications/domain";
import { ProfileProvider } from "@/lib/profile/context";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import type { JobPosting } from "@/types/analysis";
import type { ApplicationAnalysisSnapshot } from "@/types/application";
import { ApplicationSnapshotView } from "./ApplicationDetail";

function render(snapshot: ApplicationAnalysisSnapshot) {
  return renderToStaticMarkup(<TooltipProvider><ApplicationSnapshotView snapshot={snapshot} /></TooltipProvider>);
}

function job(): JobPosting {
  const profile = createDemoProfile();
  return {
    id: "different-employer-job",
    company: "Evidence Research",
    role: "Experiment Designer",
    location: "Istanbul",
    requirements: [{
      id: "different-requirement",
      label: "Design reproducible experiments",
      sourceText: "Design reproducible experiments for haptics research.",
      importance: "core",
      category: "experience",
      profileMatches: [{
        link: { recordType: "experience", recordId: profile.experiences[0].id, claimId: profile.experiences[0].responsibilities[0].id },
        relevance: "direct",
      }],
    }],
  };
}

test("saved analysis presentation uses the selected job's requirements and verified excerpts", () => {
  const profile = createDemoProfile();
  const record = createApplicationRecord({ id: "application-view", job: job(), profile });
  assert.ok(record);
  const html = render(getLatestSnapshot(record));
  assert.match(html, /Design reproducible experiments/);
  assert.match(html, /Designed haptic psychophysics experiments in virtual reality/);
  assert.match(html, /User-entered information/);
  assert.match(html, /What-if overrides are excluded/);
  assert.doesNotMatch(html, /Hamilton|Clinical Research Specialist|sample analysis|ventilator/i);
});

test("an earlier snapshot remains viewable after a correction invalidates current evidence", () => {
  const profile = createDemoProfile();
  const record = createApplicationRecord({ id: "application-history", job: job(), profile });
  assert.ok(record);
  const earlier = getLatestSnapshot(record);
  const originalText = profile.experiences[0].responsibilities[0].text;
  profile.experiences[0].responsibilities[0].text = "Unconfirmed correction to my responsibilities";
  profile.experiences[0].responsibilities[0].verificationStatus = "needs_confirmation";
  const refreshed = refreshApplicationRecord(record, profile);
  assert.ok(refreshed);
  const latest = getLatestSnapshot(refreshed);
  assert.notEqual(latest.id, earlier.id);
  assert.match(render(earlier), new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(render(latest), /Unconfirmed correction|Designed haptic psychophysics/);
  assert.match(render(latest), /No verified Profile excerpts supported/);
  assert.equal(earlier.analysis.overallFit, 100);
  assert.equal(latest.analysis.overallFit, 0);
});

test("saved critical eligibility stays a separate unresolved gate without interactive overrides", () => {
  const profile = createDemoProfile();
  const posting = job();
  posting.requirements.push({
    id: "eligibility-gate",
    label: "Swiss work authorization",
    category: "work_authorization",
    importance: "critical",
    isHardBlocker: true,
    eligibility: { acceptedRegions: ["Switzerland", "EU", "EFTA"], sponsorshipAvailable: false },
  });
  const record = createApplicationRecord({ id: "application-eligibility-view", job: posting, profile });
  assert.ok(record);
  const snapshot = getLatestSnapshot(record);
  assert.equal(snapshot.analysis.overallFit, 100);
  const html = render(snapshot);
  assert.match(html, /Eligibility is assessed separately from the fit percentage/);
  assert.match(html, /Needs confirmation/);
  assert.doesNotMatch(html, /I have authorization|I need sponsorship|Assess as:/);
});

test("an unconfirmed authorization report is labelled separately from verified facts", () => {
  const profile = createDemoProfile();
  const authorization = profile.workAuthorizations[0];
  authorization.status = "authorized";
  authorization.verificationStatus = "needs_confirmation";
  authorization.expiresAt = "2026-10-15";
  const posting = job();
  posting.requirements.push({
    id: "pending-eligibility",
    label: "Swiss work authorization",
    category: "work_authorization",
    importance: "critical",
    isHardBlocker: true,
    eligibility: { acceptedRegions: ["Switzerland", "EU", "EFTA"], sponsorshipAvailable: false },
  });
  const record = createApplicationRecord({ id: "application-pending-authorization", job: posting, profile, now: "2026-10-12T12:00:00.000Z" });
  assert.ok(record);
  const snapshot = getLatestSnapshot(record);
  assert.equal(snapshot.analysis.criticalIssues[0].status, "needs_confirmation");
  const html = render(snapshot);
  assert.match(html, /Unconfirmed report — Authorized to work/);
  assert.match(html, /Needs confirmation when saved/);
  assert.match(html, /Expiry: <time dateTime="2026-10-15">2026-10-15<\/time>/);
  assert.doesNotMatch(html, /Verified when saved|expired when saved/);
});

test("historical authorization expiry is described at the snapshot's capture time", () => {
  const profile = createDemoProfile();
  const authorization = profile.workAuthorizations[0];
  authorization.status = "authorized";
  authorization.verificationStatus = "verified";
  authorization.expiresAt = "2026-10-13T00:00:00.000Z";
  const posting = job();
  posting.requirements.push({
    id: "expiring-eligibility",
    label: "Swiss work authorization",
    category: "work_authorization",
    importance: "critical",
    isHardBlocker: true,
    eligibility: { acceptedRegions: ["Switzerland", "EU", "EFTA"], sponsorshipAvailable: false },
  });
  const beforeExpiry = createApplicationRecord({ id: "application-before-expiry", job: posting, profile, now: "2026-10-12T12:00:00.000Z" });
  const afterExpiry = createApplicationRecord({ id: "application-after-expiry", job: posting, profile, now: "2026-10-14T12:00:00.000Z" });
  assert.ok(beforeExpiry);
  assert.ok(afterExpiry);
  const earlierHtml = render(getLatestSnapshot(beforeExpiry));
  const laterHtml = render(getLatestSnapshot(afterExpiry));
  assert.match(earlierHtml, /Verified when saved/);
  assert.doesNotMatch(earlierHtml, /expired when saved/);
  assert.match(laterHtml, /expired when saved/);
  assert.equal(getLatestSnapshot(beforeExpiry).analysis.criticalIssues[0].status, "satisfied");
  assert.equal(getLatestSnapshot(afterExpiry).analysis.criticalIssues[0].status, "needs_confirmation");
});

test("analysis renders no demo candidate evidence before Profile hydration", () => {
  const posting = job();
  const sampleAnalysis = buildJobAnalysis({ job: posting, profile: createDemoProfile() });
  assert.equal(sampleAnalysis.overallFit, 100);
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "hydration-test",
  };
  for (const simulateLoadingOnMount of [false, true]) {
    const html = renderToStaticMarkup(
      <AppRouterContext value={router}>
        <ProfileProvider>
          <ApplicationsProvider>
            <JobAnalysisView job={posting} simulateLoadingOnMount={simulateLoadingOnMount} />
          </ApplicationsProvider>
        </ProfileProvider>
      </AppRouterContext>
    );
    assert.match(html, /Loading your Career Profile before analysing this role/);
    assert.doesNotMatch(html, /Designed haptic psychophysics|Saved fit analysis|Strong Apply|scored match|Evidence Coverage|Build application/);
  }
});
