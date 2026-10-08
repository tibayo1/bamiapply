import type { CareerProfile } from "@/types/profile";
import { createDemoProfile } from "./mock-profile";

const STORAGE_KEY = "bami.careerProfile";
const CURRENT_VERSION = 1;

interface StoredData {
  version: number;
  profile: CareerProfile;
}

export function loadProfileFromStorage(): CareerProfile {
  if (typeof window === "undefined") {
    return createDemoProfile();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoProfile();
    const parsed: StoredData = JSON.parse(raw);
    if (parsed.version === CURRENT_VERSION && parsed.profile) {
      return parsed.profile;
    }
    // Version mismatch: reset to demo
    return createDemoProfile();
  } catch (err) {
    console.warn("Failed to load profile from localStorage:", err);
    return createDemoProfile();
  }
}

export function saveProfileToStorage(profile: CareerProfile): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredData = {
      version: CURRENT_VERSION,
      profile,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save profile to localStorage:", err);
  }
}

export function clearProfileStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear profile storage:", err);
  }
}
