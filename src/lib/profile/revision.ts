import type { CareerProfile } from "@/types/profile";
import { normalizeCareerProfile } from "./validation";

/** A content fingerprint for detecting stale evidence, not an authentication token. */
export function getProfileRevision(profile: CareerProfile): string {
  const serialized = JSON.stringify(normalizeCareerProfile(profile) ?? profile);
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (let i = 0; i < serialized.length; i++) {
    first = Math.imul(first ^ serialized.charCodeAt(i), 16777619);
    second = Math.imul(second ^ serialized.charCodeAt(i), 2246822519);
  }
  return `${profile.id}:${profile.updatedAt}:${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}
