import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CVPreview } from "@/components/cv/CVPreview";
import type { CVContent, CVVersion } from "@/types/cv";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { createCVVersion } from "./domain";
import { cvContactURL, cvExportFilename, downloadCVText, getCVExportIssue, printCVVersion, renderCVPlainText, renderCVPrintHTML } from "./export";

function content(): CVContent {
  return {
    personal: {
      name: "Bámi <script>alert('candidate')</script> & Example",
      headline: "Verified research specialist",
      location: "İstanbul",
      email: "candidate@example.com",
      phone: "+90 000 123",
      linkedin: "https://www.linkedin.com/in/example",
      website: "https://example.com/research?q=<proof>&verified=true",
    },
    sections: [{
      id: "experience",
      title: "Experience",
      entries: [{
        id: "experience-verified",
        title: "Researcher & engineer",
        subtitle: "Actual candidate employer",
        location: "İstanbul",
        dates: "2021-02 – 2025-04",
        paragraphs: ["Verified summary <img src=x onerror=alert('x')>"],
        bullets: ["Measured 15 & 20 Hz signals.", "Exact multi-line claim\nwith the original wording."],
        evidence: [{ recordType: "experience", recordId: "private-source-id", claimId: "private-claim-id" }],
      }],
    }, { id: "empty", title: "Nothing selected", entries: [] }],
    skills: [{ id: "private-skill-id", name: "Python <verified>", evidence: [{ recordType: "experience", recordId: "private-source-id" }] }],
  };
}

test("plain-text CV preserves exact facts, Unicode, dates and multiline wording", () => {
  const text = renderCVPlainText(content());
  assert.equal(text, [
    "Bámi <script>alert('candidate')</script> & Example",
    "Verified research specialist",
    "İstanbul · candidate@example.com · +90 000 123 · https://www.linkedin.com/in/example · https://example.com/research?q=<proof>&verified=true",
    "", "Experience", "", "Researcher & engineer", "Actual candidate employer", "İstanbul · 2021-02 – 2025-04",
    "Verified summary <img src=x onerror=alert('x')>",
    "• Measured 15 & 20 Hz signals.", "• Exact multi-line claim\nwith the original wording.",
    "", "Skills", "Python <verified>", "",
  ].join("\n"));
  assert.doesNotMatch(text, /private-source|private-claim|private-skill|Nothing selected|fitScore|profileRevision|Eligibility|Fit percentage/);
});

test("print HTML escapes every user-controlled value and blocks scripts and remote resources", () => {
  const html = renderCVPrintHTML(content());
  assert.match(html, /Bámi &lt;script&gt;alert\(&#39;candidate&#39;\)&lt;\/script&gt; &amp; Example/);
  assert.match(html, /Verified summary &lt;img src=x onerror=alert\(&#39;x&#39;\)&gt;/);
  assert.match(html, /Measured 15 &amp; 20 Hz signals/);
  assert.match(html, /2021-02 – 2025-04/);
  assert.match(html, /Python &lt;verified&gt;/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.doesNotMatch(html, /<script|<img|<link|<iframe|href=|private-source|private-claim|Nothing selected/);
});

test("renderers do not substitute a target employer or role for candidate facts", () => {
  const minimal: CVContent = { personal: { name: "A real candidate" }, sections: [], skills: [] };
  assert.equal(renderCVPlainText(minimal), "A real candidate\n");
  const html = renderCVPrintHTML(minimal);
  assert.doesNotMatch(html, /Experience|Skills|Present|Unknown|Bámi Apply|fit|eligibility|target employer/i);
  assert.match(html, /<h1>A real candidate<\/h1>/);
});

test("export filenames include employer context without creating file paths", () => {
  const version = { content: { personal: { name: "Bámi" } }, company: "../Target\\Company", role: 'Researcher: <role> "test"' } as CVVersion;
  const filename = cvExportFilename(version, "txt");
  assert.ok(filename.startsWith("Bámi-"));
  assert.ok(filename.endsWith("-CV.txt"));
  assert.doesNotMatch(filename, /[\\/:*?"<>|\u0000-\u001f]/);
  assert.ok(cvExportFilename(version, "pdf").endsWith(".pdf"));
});

test("preview contact links allow explicit http(s) destinations only", () => {
  assert.equal(cvContactURL("https://example.com/path?q=value"), "https://example.com/path?q=value");
  assert.equal(cvContactURL("http://example.com"), "http://example.com/");
  for (const value of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//example.com", "www.example.com", "https://user:password@example.com", "mailto:candidate@example.com"]) {
    assert.equal(cvContactURL(value), null);
  }
});

test("the preview renders imported markup as text and leaves unsafe contact destinations inert", () => {
  const source = content();
  source.personal.linkedin = "javascript:alert('contact')";
  const html = renderToStaticMarkup(createElement(CVPreview, { content: source }));
  assert.match(html, /aria-label="CV preview"/);
  assert.match(html, /&lt;script&gt;alert\(&#x27;candidate&#x27;\)&lt;\/script&gt;/);
  assert.match(html, /javascript:alert\(&#x27;contact&#x27;\)/);
  assert.doesNotMatch(html, /href="javascript:|<script|<img|private-source|private-claim/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /2021-02 – 2025-04/);
});

function reviewedVersion() {
  const profile = createDemoProfile();
  const experience = profile.experiences[0];
  const version = createCVVersion({
    id: "cv-export-reviewed",
    application: { id: "application-export", profileId: profile.id, company: "Target employer", role: "Target role", job: { id: "job-export" } },
    profile,
    selection: { evidence: [{ recordType: "experience", recordId: experience.id, claimId: experience.responsibilities[0].id }], skillIds: [] },
    status: "reviewed",
    now: "2026-10-13T10:00:00.000Z",
  });
  assert.ok(version);
  return { profile, version };
}

test("only valid reviewed versions with current verified evidence can be exported", () => {
  const { profile, version } = reviewedVersion();
  assert.equal(getCVExportIssue(version, profile), null);
  assert.doesNotMatch(renderCVPlainText(version.content), /Target employer|Target role|what-if|fit percentage/i);
  const draft = { ...version, status: "draft" as const };
  assert.match(getCVExportIssue(draft, profile) ?? "", /Review and save/);
  assert.throws(() => downloadCVText(draft, profile), /Review and save/);
  assert.throws(() => printCVVersion(draft, profile), /Review and save/);
});

test("Profile corrections and revoked verification block historical exports without rewriting them", () => {
  const { profile, version } = reviewedVersion();
  const original = JSON.stringify(version);
  profile.experiences[0].responsibilities[0].text = "A corrected claim that still needs confirmation";
  profile.experiences[0].responsibilities[0].verificationStatus = "needs_confirmation";
  assert.match(getCVExportIssue(version, profile) ?? "", /Profile has changed|no longer verified/);
  assert.throws(() => downloadCVText(version, profile), /Profile has changed|no longer verified/);
  assert.throws(() => printCVVersion(version, profile), /Profile has changed|no longer verified/);
  assert.equal(JSON.stringify(version), original);
});

test("an altered stored CV and a different candidate cannot bypass the export gate", () => {
  const { profile, version } = reviewedVersion();
  const fabricated = structuredClone(version);
  fabricated.content.sections[0].entries[0].bullets.push("Invented senior executive experience");
  assert.match(getCVExportIssue(fabricated, profile) ?? "", /could not be validated/);
  assert.throws(() => downloadCVText(fabricated, profile), /could not be validated/);
  assert.equal(getCVExportIssue(version, { ...profile, id: "different-candidate" })?.includes("Profile has changed"), true);
});
