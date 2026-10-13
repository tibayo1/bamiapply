import type { ReviewedJobRecord } from "@/types/job";
import { normalizeJobPosting } from "@/lib/applications/domain";
import { MAX_JOB_DESCRIPTION_LENGTH, MAX_JOB_REQUIREMENTS } from "./ingestion";

export const JOBS_STORAGE_KEY = "bami.jobs";
export const CURRENT_JOBS_VERSION = 1;

export interface JobsStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface JobsStorageLoadResult {
  jobs: ReviewedJobRecord[];
  canPersist: boolean;
  issue: string | null;
  raw: string | null;
}

export interface JobsStorageSaveResult {
  saved: boolean;
  issue: string | null;
  raw?: string | null;
}

export const JOBS_CONFLICT_MESSAGE =
  "Your saved jobs changed in another tab. Saving is paused to preserve both versions. Export this tab's jobs, then reload to review the saved version.";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

/** Validate persisted employer data without requiring Profile links to still exist. */
export function normalizeReviewedJobs(input: unknown): ReviewedJobRecord[] | null {
  if (!Array.isArray(input)) return null;
  const jobs: ReviewedJobRecord[] = [];
  const ids = new Set<string>();
  for (const item of input) {
    if (!object(item) || !onlyKeys(item, ["id", "profileId", "posting", "createdAt"])
      || !nonempty(item.id) || !/^job-[^\s/]+$/.test(item.id) || ids.has(item.id)
      || !nonempty(item.profileId) || !nonempty(item.createdAt) || !Number.isFinite(Date.parse(item.createdAt))
      || !object(item.posting) || item.posting.id !== item.id
      || !onlyKeys(item.posting, ["id", "company", "role", "location", "sourceUrl", "rawDescription", "requirements"])
      || !nonempty(item.posting.rawDescription) || item.posting.rawDescription.length > MAX_JOB_DESCRIPTION_LENGTH
      || !Array.isArray(item.posting.requirements) || item.posting.requirements.length > MAX_JOB_REQUIREMENTS
      || ![item.posting.company, item.posting.role, item.posting.location].every((field) => typeof field === "string" && field.length <= 200)
      || (item.posting.sourceUrl !== undefined && (typeof item.posting.sourceUrl !== "string" || item.posting.sourceUrl.length > 2000))) return null;
    for (const requirement of item.posting.requirements) {
      if (!object(requirement) || !onlyKeys(requirement, ["id", "label", "description", "sourceText", "importance", "category", "rationale", "confirmationQuestion", "isHardBlocker", "profileMatches", "eligibility", "notes"])
        || !nonempty(requirement.label) || requirement.label.length > 300
        || !nonempty(requirement.sourceText) || !item.posting.rawDescription.includes(requirement.sourceText)
        || (requirement.isHardBlocker === true && requirement.importance !== "critical")) return null;
      if (requirement.profileMatches !== undefined && (!Array.isArray(requirement.profileMatches)
        || !requirement.profileMatches.every((match) => object(match) && onlyKeys(match, ["link", "relevance"])
          && object(match.link) && onlyKeys(match.link, ["recordType", "recordId", "claimId"])))) return null;
      if (requirement.eligibility !== undefined && (!object(requirement.eligibility)
        || !onlyKeys(requirement.eligibility, ["acceptedRegions", "sponsorshipAvailable"])
        || requirement.importance !== "critical" || requirement.category !== "work_authorization")) return null;
      if (requirement.importance === "critical" && requirement.category === "work_authorization"
        && (!object(requirement.eligibility) || !Array.isArray(requirement.eligibility.acceptedRegions)
          || !requirement.eligibility.acceptedRegions.length || requirement.eligibility.acceptedRegions.length > 20
          || !requirement.eligibility.acceptedRegions.every((region) => nonempty(region) && region.length <= 100))) return null;
      if (requirement.notes !== undefined && (!object(requirement.notes)
        || !onlyKeys(requirement.notes, ["partial", "none"]))) return null;
    }
    const posting = normalizeJobPosting(item.posting);
    if (!posting || !posting.requirements.some((requirement) => requirement.importance === "core")) return null;
    ids.add(item.id);
    jobs.push({ id: item.id, profileId: item.profileId, posting, createdAt: item.createdAt });
  }
  return jobs;
}

function browserStorage(): JobsStorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function parseStoredJobs(raw: string): { jobs: ReviewedJobRecord[] | null; issue: string | null } {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch {
    return { jobs: null, issue: "Your saved jobs could not be read. The original data is preserved and saving is paused. Download a recovery copy before continuing." };
  }
  if (!object(parsed)) {
    return { jobs: null, issue: "Your saved jobs have an invalid format. The original data is preserved and saving is paused." };
  }
  if (parsed.version !== CURRENT_JOBS_VERSION) {
    return { jobs: null, issue: "Your saved jobs use an unsupported version. The original data is preserved and saving is paused." };
  }
  const jobs = normalizeReviewedJobs(parsed.jobs);
  return jobs === null
    ? { jobs: null, issue: "Your saved jobs contain invalid postings, reviewed requirements, or Profile links. The original data is preserved and saving is paused." }
    : { jobs, issue: null };
}

/** Loading is read-only; a new workspace has no imported fixtures. */
export function loadJobsStorage(storage?: JobsStorageLike): JobsStorageLoadResult {
  let raw: string | null = null;
  try {
    const target = storage ?? browserStorage();
    if (!target) return { jobs: [], canPersist: false, issue: null, raw };
    raw = target.getItem(JOBS_STORAGE_KEY);
    if (raw === null) return { jobs: [], canPersist: true, issue: null, raw };
    const parsed = parseStoredJobs(raw);
    return { jobs: parsed.jobs ?? [], canPersist: parsed.jobs !== null, issue: parsed.issue, raw };
  } catch {
    return { jobs: [], canPersist: false, issue: "Browser storage is unavailable. Your jobs cannot be loaded or saved; existing data has not been changed.", raw };
  }
}

export function serializeJobs(jobs: ReviewedJobRecord[]): string {
  return JSON.stringify({ version: CURRENT_JOBS_VERSION, jobs });
}

/** New bytes never become a writable checkpoint simply because we observed them. */
export function saveJobsToStorage(jobs: ReviewedJobRecord[], storage?: JobsStorageLike, expectedRaw?: string | null): JobsStorageSaveResult {
  const normalized = normalizeReviewedJobs(jobs);
  if (!normalized) {
    return { saved: false, issue: "These jobs contain invalid postings or reviewed requirements and have not been saved. Your previous saved data is preserved." };
  }
  let existing: string | null | undefined;
  try {
    const target = storage ?? browserStorage();
    if (!target) return { saved: false, issue: "Browser storage is unavailable. Changes have not been saved." };
    existing = target.getItem(JOBS_STORAGE_KEY);
    if (expectedRaw !== undefined && existing !== expectedRaw) return { saved: false, issue: JOBS_CONFLICT_MESSAGE, raw: existing };
    if (existing !== null) {
      const parsed = parseStoredJobs(existing);
      if (!parsed.jobs) return { saved: false, issue: parsed.issue, raw: existing };
    }
    const raw = serializeJobs(normalized);
    if (raw !== existing) target.setItem(JOBS_STORAGE_KEY, raw);
    return { saved: true, issue: null, raw };
  } catch {
    return { saved: false, issue: "Your jobs could not be saved in this browser. No changes were applied. Download your jobs before leaving this tab.", raw: existing };
  }
}
