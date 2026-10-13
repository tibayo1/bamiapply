import type { ApplicationRecord } from "@/types/application";
import { normalizeApplications } from "./domain";

export const APPLICATIONS_STORAGE_KEY = "bami.applications";
export const CURRENT_APPLICATIONS_VERSION = 1;

export interface ApplicationsStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ApplicationsStorageLoadResult {
  applications: ApplicationRecord[];
  canPersist: boolean;
  issue: string | null;
  /** Original bytes are retained for an explicit recovery download, never logged. */
  raw: string | null;
}

export interface ApplicationsStorageSaveResult {
  saved: boolean;
  issue: string | null;
  /** Exact saved bytes, or observed bytes when a write was blocked. */
  raw?: string | null;
}

export const APPLICATIONS_CONFLICT_MESSAGE =
  "Your saved applications changed in another tab. Saving is paused to preserve both versions. Export this tab's applications, then reload to review the saved version.";

function browserStorage(): ApplicationsStorageLike | null {
  if (typeof window === "undefined") return null;
  // Reading the localStorage property can throw before any method is called.
  return window.localStorage;
}

function parseStoredApplications(raw: string): {
  applications: ApplicationRecord[] | null;
  issue: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      applications: null,
      issue: "Your saved applications could not be read. The original data is preserved and saving is paused. Download a recovery copy before continuing.",
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      applications: null,
      issue: "Your saved applications have an invalid format. The original data is preserved and saving is paused.",
    };
  }
  const payload = parsed as Record<string, unknown>;
  if (payload.version !== CURRENT_APPLICATIONS_VERSION) {
    return {
      applications: null,
      issue: "Your saved applications use an unsupported version. The original data is preserved and saving is paused.",
    };
  }
  const applications = normalizeApplications(payload.applications);
  if (!applications) {
    return {
      applications: null,
      issue: "Your saved applications contain invalid records, analysis, or evidence metadata. The original data is preserved and saving is paused.",
    };
  }
  return { applications, issue: null };
}

/** An absent key starts empty. Loading never seeds fixtures or changes saved bytes. */
export function loadApplicationsStorage(storage?: ApplicationsStorageLike): ApplicationsStorageLoadResult {
  let raw: string | null = null;
  try {
    const target = storage ?? browserStorage();
    if (!target) return { applications: [], canPersist: false, issue: null, raw };
    raw = target.getItem(APPLICATIONS_STORAGE_KEY);
    if (raw === null) return { applications: [], canPersist: true, issue: null, raw };
    const parsed = parseStoredApplications(raw);
    return {
      applications: parsed.applications ?? [],
      canPersist: parsed.applications !== null,
      issue: parsed.issue,
      raw,
    };
  } catch {
    return {
      applications: [],
      canPersist: false,
      issue: "Browser storage is unavailable. Your applications cannot be loaded or saved; existing data has not been changed.",
      raw,
    };
  }
}

export function serializeApplications(applications: ApplicationRecord[]): string {
  return JSON.stringify({ version: CURRENT_APPLICATIONS_VERSION, applications });
}

/**
 * Validate both boundaries before writing. expectedRaw detects stale writers;
 * observing new bytes never grants permission to overwrite their owner.
 */
export function saveApplicationsToStorage(
  applications: ApplicationRecord[],
  storage?: ApplicationsStorageLike,
  expectedRaw?: string | null
): ApplicationsStorageSaveResult {
  const normalized = normalizeApplications(applications);
  if (!normalized) {
    return {
      saved: false,
      issue: "These applications contain invalid records, analysis, or evidence metadata and have not been saved. Your previous saved data is preserved.",
    };
  }
  let existing: string | null | undefined;
  try {
    const target = storage ?? browserStorage();
    if (!target) return { saved: false, issue: "Browser storage is unavailable. Changes have not been saved." };
    existing = target.getItem(APPLICATIONS_STORAGE_KEY);
    if (expectedRaw !== undefined && existing !== expectedRaw) {
      return { saved: false, issue: APPLICATIONS_CONFLICT_MESSAGE, raw: existing };
    }
    if (existing !== null) {
      const parsed = parseStoredApplications(existing);
      if (!parsed.applications) return { saved: false, issue: parsed.issue, raw: existing };
    }
    const raw = serializeApplications(normalized);
    // A duplicate save still checks its checkpoint, but need not write again.
    if (raw !== existing) target.setItem(APPLICATIONS_STORAGE_KEY, raw);
    return { saved: true, issue: null, raw };
  } catch {
    return {
      saved: false,
      issue: "Your applications could not be saved in this browser. No changes were applied. Download your applications before leaving this tab.",
      raw: existing,
    };
  }
}
