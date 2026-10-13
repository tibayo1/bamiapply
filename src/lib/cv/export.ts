import { isCVVersionStale, normalizeCVVersions } from "@/lib/cv/domain";
import { resolveEvidenceLink } from "@/lib/profile/evidence";
import type { CVContent, CVVersion } from "@/types/cv";
import type { CareerProfile } from "@/types/profile";

/** A saved review cannot be exported after its factual sources have changed. */
export function getCVExportIssue(version: CVVersion, profile: CareerProfile): string | null {
  const validated = normalizeCVVersions([version], {
    id: version.applicationId,
    profileId: version.profileId,
    job: { id: version.jobId },
    company: version.company,
    role: version.role,
  });
  if (!validated) return "This saved CV could not be validated. Create a new version before exporting.";
  if (version.status !== "reviewed") return "Review and save this CV before exporting.";
  if (version.profileId !== profile.id || isCVVersionStale(version, profile)) {
    return "Your Profile has changed. Create and review a new CV version before exporting.";
  }
  const evidence = version.content.sections.flatMap((section) => section.entries.flatMap((entry) => entry.evidence));
  evidence.push(...version.content.skills.flatMap((skill) => skill.evidence));
  if (evidence.some((link) => !resolveEvidenceLink(profile, link)?.usable)) {
    return "Some CV evidence is no longer verified. Update your Profile and review a new version before exporting.";
  }
  return null;
}

/** Contact strings remain literal text in downloads and printouts. */
export function cvContactText(content: CVContent): string[] {
  const { location, email, phone, linkedin, website } = content.personal;
  return [location, email, phone, linkedin, website].filter((value): value is string => Boolean(value));
}

export function cvContactURL(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function renderCVPlainText(content: CVContent): string {
  const lines = [content.personal.name];
  if (content.personal.headline) lines.push(content.personal.headline);
  const contacts = cvContactText(content);
  if (contacts.length) lines.push(contacts.join(" · "));
  for (const section of content.sections) {
    if (!section.entries.length) continue;
    lines.push("", section.title);
    for (const entry of section.entries) {
      lines.push("", entry.title);
      if (entry.subtitle) lines.push(entry.subtitle);
      const details = [entry.location, entry.dates].filter(Boolean);
      if (details.length) lines.push(details.join(" · "));
      lines.push(...entry.paragraphs, ...entry.bullets.map((bullet) => `• ${bullet}`));
    }
  }
  if (content.skills.length) lines.push("", "Skills", content.skills.map((skill) => skill.name).join(" · "));
  return `${lines.join("\n")}\n`;
}

function escapeHTML(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

const PRINT_CSS = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body { margin: 0; color: #17202a; background: #fff; font: 10.5pt/1.5 Arial, sans-serif; overflow-wrap: anywhere; }
  h1 { margin: 0; font-size: 24pt; line-height: 1.2; }
  .headline { margin: 6pt 0; font-size: 12pt; }
  .contact { margin: 6pt 0 0; color: #414b57; font-size: 9pt; }
  section { margin-top: 18pt; }
  h2 { margin: 0 0 9pt; padding-bottom: 4pt; border-bottom: 1pt solid #d4d8de; font-size: 12pt; break-after: avoid; }
  article { margin-bottom: 12pt; }
  .entry-header { break-inside: avoid; break-after: avoid; }
  h3 { margin: 0; font-size: 11pt; }
  .subtitle { margin: 2pt 0 0; }
  .details { margin: 2pt 0 0; color: #414b57; font-size: 9pt; }
  p { margin: 5pt 0; white-space: pre-line; orphans: 3; widows: 3; }
  ul { margin: 5pt 0; padding-left: 17pt; }
  li { margin: 3pt 0; white-space: pre-line; break-inside: avoid; }
`;

/** Escaped, self-contained HTML: no scripts, remote resources or product UI. */
export function renderCVPrintHTML(content: CVContent): string {
  const personal = content.personal;
  const contacts = cvContactText(content);
  const sections = content.sections.filter((section) => section.entries.length).map((section) => (
    `<section><h2>${escapeHTML(section.title)}</h2>${section.entries.map((entry) => {
      const details = [entry.location, entry.dates].filter(Boolean).join(" · ");
      return `<article><div class="entry-header"><h3>${escapeHTML(entry.title)}</h3>${entry.subtitle ? `<p class="subtitle">${escapeHTML(entry.subtitle)}</p>` : ""}${details ? `<p class="details">${escapeHTML(details)}</p>` : ""}</div>${entry.paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("")}${entry.bullets.length ? `<ul>${entry.bullets.map((bullet) => `<li>${escapeHTML(bullet)}</li>`).join("")}</ul>` : ""}</article>`;
    }).join("")}</section>`
  )).join("");
  const skills = content.skills.length ? `<section><h2>Skills</h2><p>${content.skills.map((skill) => escapeHTML(skill.name)).join(" · ")}</p></section>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHTML(personal.name)} CV</title><style>${PRINT_CSS}</style></head><body><header><h1>${escapeHTML(personal.name)}</h1>${personal.headline ? `<p class="headline">${escapeHTML(personal.headline)}</p>` : ""}${contacts.length ? `<p class="contact">${contacts.map(escapeHTML).join(" · ")}</p>` : ""}</header>${sections}${skills}</body></html>`;
}

export function cvExportFilename(version: CVVersion, extension: "txt" | "pdf"): string {
  const name = [version.content.personal.name, version.company, version.role, "CV"]
    .join("-").replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 160);
  return `${name || "CV"}.${extension}`;
}

function assertExportable(version: CVVersion, profile: CareerProfile): void {
  const issue = getCVExportIssue(version, profile);
  if (issue) throw new Error(issue);
}

export function downloadCVText(version: CVVersion, profile: CareerProfile): void {
  assertExportable(version, profile);
  const objectURL = URL.createObjectURL(new Blob([renderCVPlainText(version.content)], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  try {
    anchor.href = objectURL;
    anchor.download = cvExportFilename(version, "txt");
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
  }
}

/** Printing an isolated document keeps navigation and storage notices off the CV. */
export function printCVVersion(version: CVVersion, profile: CareerProfile): Promise<void> {
  assertExportable(version, profile);
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Printable CV";
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.referrerPolicy = "no-referrer";
    frame.style.cssText = "position:fixed;bottom:0;right:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    let cleanupTimer: number | undefined;
    const cleanup = () => {
      if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
      frame.remove();
    };
    frame.onerror = () => {
      cleanup();
      reject(new Error("The printable CV could not load. Try downloading the text version."));
    };
    frame.onload = () => {
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        cleanup();
        reject(new Error("Printing is unavailable in this browser. Try downloading the text version."));
        return;
      }
      try {
        printWindow.addEventListener("afterprint", cleanup, { once: true });
        cleanupTimer = window.setTimeout(cleanup, 60_000);
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch {
        cleanup();
        reject(new Error("The print dialog could not open. Try downloading the text version."));
      }
    };
    frame.srcdoc = renderCVPrintHTML(version.content);
    document.body.append(frame);
  });
}
