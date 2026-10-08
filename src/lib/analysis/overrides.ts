import type { JobRequirement } from "@/types/analysis";

/**
 * Per-analysis, in-memory overrides. These answer "what if?" questions for ONE
 * analysis and never change the Career Profile.
 */
export type RequirementOverride =
  | { action: "satisfy" }
  | { action: "block" }
  | { action: "confirm_experience"; note: string };

export type OverrideMap = Record<string, RequirementOverride>;

export function applyOverrides(
  requirements: JobRequirement[],
  overrides: OverrideMap
): JobRequirement[] {
  return requirements.map((r) => {
    const o = overrides[r.id];
    if (!o) return r;
    switch (o.action) {
      case "satisfy":
        return {
          ...r,
          criticalStatus: "satisfied",
          evidenceStrength: "strong",
          userOverride: { confirmed: true, note: "You said you meet this requirement." },
        };
      case "block":
        return {
          ...r,
          criticalStatus: "unmet",
          evidenceStrength: "none",
          isHardBlocker: true,
          userOverride: { confirmed: false, note: "You said you do not meet this requirement." },
        };
      case "confirm_experience":
        return { ...r, userOverride: { confirmed: true, note: o.note } };
    }
  });
}
