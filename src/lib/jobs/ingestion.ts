import type { CareerProfile, EvidenceLink } from "@/types/profile";
import type { JobPosting, JobRequirementSpec } from "@/types/analysis";
import type { JobDraftInput } from "@/types/job";
import { normalizeCareerProfile } from "@/lib/profile/validation";
import { resolveEvidenceLink, linkKey, type ResolvedEvidence } from "@/lib/profile/evidence";
import { normalizeJobPosting } from "@/lib/applications/domain";

import { MAX_JOB_DESCRIPTION_LENGTH, MAX_JOB_REQUIREMENTS } from "./requirements";
export { createRequirementDraft, suggestJobRequirements, suggestJobRequirementsDetailed, MAX_JOB_DESCRIPTION_LENGTH, MAX_JOB_REQUIREMENTS } from "./requirements";

const IMPORTANCES = ["critical", "core", "preferred", "contextual"];
const CATEGORIES = ["education", "experience", "skill", "industry", "language", "location", "work_authorization", "certification", "license", "seniority", "other"];

/** Verified records/claims are the only choices for explicit requirement links. */
export function getJobEvidenceOptions(profile: CareerProfile): ResolvedEvidence[] {
  const links: EvidenceLink[] = [];
  for (const record of profile.experiences) {
    links.push({ recordType: "experience", recordId: record.id });
    for (const claim of record.responsibilities) links.push({ recordType: "experience", recordId: record.id, claimId: claim.id });
  }
  for (const record of profile.researchProjects) {
    links.push({ recordType: "research_project", recordId: record.id });
    for (const claim of record.outcomes) links.push({ recordType: "research_project", recordId: record.id, claimId: claim.id });
  }
  for (const record of profile.education) links.push({ recordType: "education", recordId: record.id });
  for (const record of profile.achievements) links.push({ recordType: "achievement", recordId: record.id });
  for (const record of profile.careerStories) links.push({ recordType: "career_story", recordId: record.id });
  return links.map((link) => resolveEvidenceLink(profile, link)).filter((item): item is ResolvedEvidence => item?.usable === true);
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function member(value: unknown, values: string[]): value is string { return typeof value === "string" && values.includes(value); }
function cleanLink(link: EvidenceLink): EvidenceLink {
  return { recordType: link.recordType, recordId: link.recordId, ...(link.claimId === undefined ? {} : { claimId: link.claimId }) };
}

/** Validate a reviewed posting against the original text and current Profile. */
export function reviewJobInput(input: JobDraftInput, profile: CareerProfile): { job: JobPosting | null; error: string | null } {
  const fail = (error: string) => ({ job: null, error });
  const source = normalizeCareerProfile(profile);
  if (!source) return fail("Review your Career Profile before linking evidence to this role.");
  if (!object(input) || !nonempty(input.company) || !nonempty(input.role)
    || typeof input.location !== "string" || typeof input.sourceUrl !== "string"
    || !nonempty(input.rawDescription)) return fail("Enter the company, role title and original job description.");
  if (input.company.length > 200 || input.role.length > 200 || input.location.length > 200 || input.sourceUrl.length > 2000
    || input.rawDescription.length > MAX_JOB_DESCRIPTION_LENGTH) return fail("Keep job details within their limits and the description under 30,000 characters.");
  const sourceUrl = input.sourceUrl.trim();
  if (sourceUrl) {
    try { if (!["https:", "http:"].includes(new URL(sourceUrl).protocol)) return fail("Use an http or https link for the original posting."); }
    catch { return fail("Enter a valid link to the original posting, or leave it blank."); }
  }
  if (!Array.isArray(input.requirements) || !input.requirements.length || input.requirements.length > MAX_JOB_REQUIREMENTS)
    return fail("Review between 1 and 30 requirements before analysing this job.");
  const requirements: JobRequirementSpec[] = [];
  const ids = new Set<string>();
  for (const item of input.requirements) {
    if (!object(item) || !nonempty(item.id) || ids.has(item.id) || !nonempty(item.label) || item.label.length > 300
      || !nonempty(item.sourceText) || !member(item.importance, IMPORTANCES) || !member(item.category, CATEGORIES)
      || !Array.isArray(item.profileMatches) || typeof item.isHardBlocker !== "boolean" || typeof item.acceptedRegions !== "string"
      || !member(item.sponsorship, ["unknown", "available", "unavailable"])) return fail("Complete every requirement's label, source quote, importance and category.");
    if (!input.rawDescription.includes(item.sourceText.trim())) return fail("Each requirement's source quote must appear in the original job description. Copy it directly from the posting.");
    ids.add(item.id);
    const matches: JobRequirementSpec["profileMatches"] = [];
    const links = new Set<string>();
    for (const match of item.profileMatches) {
      if (!object(match) || !object(match.link) || !member(match.relevance, ["direct", "adjacent"]))
        return fail("Select valid Career Profile evidence and its relevance for each requirement.");
      const proof = resolveEvidenceLink(source, match.link as unknown as EvidenceLink);
      if (!proof?.usable) return fail("One of your evidence selections is missing or no longer verified. Review it in Career Profile before continuing.");
      const key = linkKey(proof.link);
      if (links.has(key)) return fail("Link each Profile record or claim only once per requirement.");
      links.add(key);
      matches.push({ link: cleanLink(proof.link), relevance: match.relevance as "direct" | "adjacent" });
    }
    const requirement: JobRequirementSpec = { id: item.id, label: item.label.trim(), sourceText: item.sourceText.trim(),
      importance: item.importance as JobRequirementSpec["importance"], category: item.category as JobRequirementSpec["category"],
      ...(matches.length ? { profileMatches: matches } : {}) };
    if (item.importance === "critical") {
      requirement.isHardBlocker = item.isHardBlocker;
      if (item.category === "work_authorization") {
        const acceptedRegions = [...new Set(item.acceptedRegions.split(/[,;\n]/).map((region) => region.trim()).filter(Boolean))];
        if (!acceptedRegions.length || acceptedRegions.length > 20 || acceptedRegions.some((region) => region.length > 100))
          return fail("Specify the employer's accepted work-authorization regions for each eligibility gate.");
        requirement.eligibility = { acceptedRegions, sponsorshipAvailable: item.sponsorship === "unknown" ? null : item.sponsorship === "available" };
      }
    }
    requirements.push(requirement);
  }
  if (!requirements.some((item) => item.importance === "core")) return fail("Include at least one core requirement so the fit assessment has a meaningful basis.");
  const job = normalizeJobPosting({ id: "reviewed-draft", company: input.company.trim(), role: input.role.trim(),
    location: input.location.trim(), rawDescription: input.rawDescription, ...(sourceUrl ? { sourceUrl } : {}), requirements });
  return job ? { job, error: null } : fail("These requirements could not be reviewed. Check their source information and evidence links.");
}
