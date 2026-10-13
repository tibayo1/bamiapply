import type { CareerProfile } from "@/types/profile";
import { createDemoProfile } from "./mock-profile";
import { createRecoveryProfile, normalizeCareerProfile } from "./validation";

export const PROFILE_STORAGE_KEY = "bami.careerProfile";
export const CURRENT_PROFILE_VERSION = 1;

export interface ProfileStorageLoadResult {
  profile: CareerProfile;
  canPersist: boolean;
  issue: string | null;
  /** Kept only for an explicit recovery download, never logged. */
  raw: string | null;
}

export interface ProfileStorageSaveResult {
  saved: boolean;
  issue: string | null;
  /** Exact saved bytes, or the observed bytes when a write was blocked. */
  raw?: string | null;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  // Accessing the localStorage property itself can throw in restricted browsers.
  return window.localStorage;
}

function parseStoredProfile(raw: string): { profile: CareerProfile | null; issue: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { profile: null, issue: "Your saved profile could not be read. The original data is preserved and saving is paused. Download a recovery copy before making changes." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { profile: null, issue: "Your saved profile has an invalid format. The original data is preserved and saving is paused." };
  }
  const payload = parsed as Record<string, unknown>;
  if (payload.version !== CURRENT_PROFILE_VERSION) {
    return { profile: null, issue: "Your saved profile uses an unsupported version. The original data is preserved and saving is paused." };
  }
  const profile = normalizeCareerProfile(payload.profile);
  if (!profile) {
    return { profile: null, issue: "Your saved profile contains invalid records or evidence metadata. The original data is preserved and saving is paused." };
  }
  return { profile, issue: null };
}

/** Load without ever replacing unreadable, invalid or newer persisted data. */
export function loadProfileStorage(storage?: StorageLike): ProfileStorageLoadResult {
  let raw: string | null = null;
  try {
    const target = storage ?? browserStorage();
    if (!target) return { profile: createDemoProfile(), canPersist: false, issue: null, raw };
    raw = target.getItem(PROFILE_STORAGE_KEY);
    if (raw === null) return { profile: createDemoProfile(), canPersist: true, issue: null, raw };
    const parsed = parseStoredProfile(raw);
    return {
      profile: parsed.profile ?? createRecoveryProfile(),
      canPersist: parsed.profile !== null,
      issue: parsed.issue,
      raw,
    };
  } catch {
    return {
      profile: createRecoveryProfile(),
      canPersist: false,
      issue: "Browser storage is unavailable. Your profile cannot be loaded or saved; existing data has not been changed.",
      raw,
    };
  }
}

/** Compatibility wrapper; providers should use the richer recovery result. */
export function loadProfileFromStorage(): CareerProfile {
  return loadProfileStorage().profile;
}

export function serializeProfile(profile: CareerProfile): string {
  return JSON.stringify({ version: CURRENT_PROFILE_VERSION, profile });
}

/**
 * Validate the incoming profile and the existing stored payload on every write.
 * Even callers outside ProfileProvider cannot overwrite unreadable/newer data.
 * A caller supplying its last loaded/saved bytes also detects external changes
 * and must reload or reconcile rather than advancing a stale checkpoint.
 */
export function saveProfileToStorage(
  profile: CareerProfile,
  storage?: StorageLike,
  expectedRaw?: string | null
): ProfileStorageSaveResult {
  const normalized = normalizeCareerProfile(profile);
  if (!normalized) {
    return { saved: false, issue: "This profile contains invalid records or evidence metadata and has not been saved. Your previous saved data is preserved." };
  }
  let existing: string | null | undefined;
  try {
    const target = storage ?? browserStorage();
    if (!target) return { saved: false, issue: "Browser storage is unavailable. Changes have not been saved." };
    existing = target.getItem(PROFILE_STORAGE_KEY);
    if (expectedRaw !== undefined && existing !== expectedRaw) {
      return {
        saved: false,
        issue: "Your saved profile changed since this tab loaded it. Saving is paused to preserve both versions. Export current changes, then reload to review the saved profile.",
        raw: existing,
      };
    }
    if (existing !== null) {
      const parsed = parseStoredProfile(existing);
      if (!parsed.profile) return { saved: false, issue: parsed.issue, raw: existing };
    }
    const raw = serializeProfile(normalized);
    target.setItem(PROFILE_STORAGE_KEY, raw);
    return { saved: true, issue: null, raw };
  } catch {
    return { saved: false, issue: "Your latest changes could not be saved in this browser. Keep this page open and download your profile before leaving.", raw: existing };
  }
}

/** Explicit destructive API; no recovery or hydration path calls this. */
export function clearProfileStorage(): ProfileStorageSaveResult {
  try {
    const target = browserStorage();
    if (!target) return { saved: false, issue: "Browser storage is unavailable." };
    target.removeItem(PROFILE_STORAGE_KEY);
    return { saved: true, issue: null };
  } catch {
    return { saved: false, issue: "Your saved profile could not be cleared." };
  }
}
