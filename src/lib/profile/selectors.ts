import type {
  CareerProfile,
  EvidenceLink,
  EvidenceRecordType,
  ProfileClaim,
  ProfileCollection,
  VerificationStatus,
  WorkAuthorization,
} from "@/types/profile";
import {
  getRecordClaims,
  linkKey,
  resolveEvidenceLink,
  type EvidenceRecord,
  type ResolvedEvidence,
} from "./evidence";
import type { SectionId } from "./sections";

/** Pure, reusable profile selectors. Nothing here touches React or storage. */

// ── Verified claims ─────────────────────────────────────────────────────────

export interface VerifiedClaim {
  claim: ProfileClaim;
  recordType: EvidenceRecordType;
  recordId: string;
  recordTitle: string;
}

/**
 * Every claim Bámi may use as evidence: the claim AND its parent record must be
 * verified. Draft and needs_confirmation claims are excluded.
 */
export function getVerifiedClaims(profile: CareerProfile): VerifiedClaim[] {
  const out: VerifiedClaim[] = [];
  for (const r of profile.experiences) {
    if (r.verificationStatus !== "verified") continue;
    for (const claim of r.responsibilities) {
      if (claim.verificationStatus === "verified") {
        out.push({ claim, recordType: "experience", recordId: r.id, recordTitle: r.title });
      }
    }
  }
  for (const r of profile.researchProjects) {
    if (r.verificationStatus !== "verified") continue;
    for (const claim of r.outcomes) {
      if (claim.verificationStatus === "verified") {
        out.push({ claim, recordType: "research_project", recordId: r.id, recordTitle: r.title });
      }
    }
  }
  return out;
}

// ── Unconfirmed items ───────────────────────────────────────────────────────

export interface UnconfirmedItem {
  kind: "record" | "claim";
  status: Exclude<VerificationStatus, "verified">;
  collection: ProfileCollection;
  recordId: string;
  claimId?: string;
  label: string;
}

/** Records and claims that are not verified yet (imported items and drafts). */
export function getUnconfirmedItems(profile: CareerProfile): UnconfirmedItem[] {
  const out: UnconfirmedItem[] = [];

  function addRecord(
    collection: ProfileCollection,
    id: string,
    label: string,
    status: VerificationStatus
  ) {
    if (status !== "verified") out.push({ kind: "record", status, collection, recordId: id, label });
  }

  function addClaims(collection: ProfileCollection, recordId: string, claims: ProfileClaim[]) {
    for (const c of claims) {
      if (c.verificationStatus !== "verified") {
        out.push({
          kind: "claim",
          status: c.verificationStatus,
          collection,
          recordId,
          claimId: c.id,
          label: c.text,
        });
      }
    }
  }

  for (const r of profile.experiences) {
    addRecord("experiences", r.id, `${r.title} · ${r.organization}`, r.verificationStatus);
    addClaims("experiences", r.id, r.responsibilities);
  }
  for (const r of profile.education) {
    addRecord("education", r.id, `${r.degree}, ${r.fieldOfStudy}`, r.verificationStatus);
  }
  for (const r of profile.researchProjects) {
    addRecord("researchProjects", r.id, r.title, r.verificationStatus);
    addClaims("researchProjects", r.id, r.outcomes);
  }
  for (const r of profile.skills) addRecord("skills", r.id, r.name, r.verificationStatus);
  for (const r of profile.achievements) addRecord("achievements", r.id, r.title, r.verificationStatus);
  for (const r of profile.careerStories) addRecord("careerStories", r.id, r.title, r.verificationStatus);
  for (const r of profile.workAuthorizations) {
    addRecord("workAuthorizations", r.id, `Work authorization · ${r.countryOrRegion}`, r.verificationStatus);
  }
  return out;
}

// ── Skills ↔ evidence ───────────────────────────────────────────────────────

/**
 * Evidence behind a skill: the skill's own links plus any record that lists the
 * skill in its `skillIds` (experience / project / story). De-duplicated.
 *
 * By default only verified (usable) evidence is returned. Pass
 * `includeUnverified` for UI that wants to show everything with labels.
 */
export function getEvidenceForSkill(
  profile: CareerProfile,
  skillId: string,
  options: { includeUnverified?: boolean } = {}
): ResolvedEvidence[] {
  const skill = profile.skills.find((s) => s.id === skillId);
  if (!skill) return [];

  const links: EvidenceLink[] = [...skill.evidenceLinks];
  for (const r of profile.experiences) {
    if (r.skillIds.includes(skillId)) links.push({ recordType: "experience", recordId: r.id });
  }
  for (const r of profile.researchProjects) {
    if (r.skillIds.includes(skillId)) links.push({ recordType: "research_project", recordId: r.id });
  }
  for (const r of profile.careerStories) {
    if (r.skillIds.includes(skillId)) links.push({ recordType: "career_story", recordId: r.id });
  }

  const seen = new Set<string>();
  const specific = new Set(
    links.filter((l) => l.claimId).map((l) => `${l.recordType}:${l.recordId}`)
  );
  const out: ResolvedEvidence[] = [];
  for (const link of links) {
    // A record-level link is redundant when a claim-level link to the same record exists.
    if (!link.claimId && specific.has(`${link.recordType}:${link.recordId}`)) continue;
    const key = linkKey(link);
    if (seen.has(key)) continue;
    seen.add(key);
    const resolved = resolveEvidenceLink(profile, link);
    if (!resolved) continue;
    if (!options.includeUnverified && !resolved.usable) continue;
    out.push(resolved);
  }
  return out;
}

// ── Work authorization (FACTS) ──────────────────────────────────────────────

const REGION_ALIASES: string[][] = [
  ["switzerland", "swiss", "ch"],
  ["eu", "european union"],
  ["efta"],
  ["türkiye", "turkiye", "turkey"],
  ["united kingdom", "uk", "great britain"],
  ["united states", "usa", "us", "united states of america"],
];

function canonicalRegion(token: string): string {
  const t = token.trim().toLowerCase();
  const group = REGION_ALIASES.find((g) => g.includes(t));
  return group ? group[0] : t;
}

function regionSet(name: string): Set<string> {
  return new Set(
    name
      .split(/[\/,;&()]|\band\b|\bor\b/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(canonicalRegion)
  );
}

const AUTH_RANK: Record<WorkAuthorization["status"], number> = {
  authorized: 0,
  requires_sponsorship: 1,
  unknown: 2,
};

function currentAuthorization(entry: WorkAuthorization, now: Date): boolean {
  if (entry.verificationStatus !== "verified" || entry.status === "unknown") return false;
  if (!entry.expiresAt) return true;
  const expiry = Date.parse(entry.expiresAt);
  return Number.isFinite(expiry) && expiry >= now.getTime();
}

function bestAuthorization(matches: WorkAuthorization[], now: Date): WorkAuthorization | undefined {
  return [...matches].sort((a, b) =>
    Number(currentAuthorization(b, now)) - Number(currentAuthorization(a, now)) ||
    AUTH_RANK[a.status] - AUTH_RANK[b.status]
  )[0];
}

/** The candidate's work-authorization entry for one country/region, if any. */
export function getWorkAuthorization(
  profile: CareerProfile,
  country: string
): WorkAuthorization | undefined {
  return getWorkAuthorizationForRegions(profile, [country]);
}

/** Best matching entry across several accepted regions (e.g. Switzerland, EU, EFTA). */
export function getWorkAuthorizationForRegions(
  profile: CareerProfile,
  regions: string[],
  now: Date = new Date()
): WorkAuthorization | undefined {
  const wanted = new Set(regions.flatMap((r) => [...regionSet(r)]));
  const matches = profile.workAuthorizations.filter((wa) =>
    [...regionSet(wa.countryOrRegion)].some((t) => wanted.has(t))
  );
  return bestAuthorization(matches, now);
}

export type EligibilityStatus = "satisfied" | "unmet" | "needs_confirmation";

/**
 * Map a work-authorization fact to a Job Analysis critical-gate status.
 * Unverified entries never satisfy or block a gate: they ask the user to confirm.
 */
export function workAuthorizationToEligibility(
  entry: WorkAuthorization | undefined,
  options: { sponsorshipAvailable?: boolean | null; now?: Date } = {}
): EligibilityStatus {
  if (!entry) return "needs_confirmation";
  if (entry.verificationStatus !== "verified") return "needs_confirmation";
  if (entry.expiresAt) {
    const expiry = new Date(entry.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry < (options.now ?? new Date())) {
      return "needs_confirmation";
    }
  }
  switch (entry.status) {
    case "authorized":
      return "satisfied";
    case "requires_sponsorship":
      if (options.sponsorshipAvailable === null) return "needs_confirmation";
      return options.sponsorshipAvailable ? "satisfied" : "unmet";
    case "unknown":
      return "needs_confirmation";
  }
}

// ── Overview signals ────────────────────────────────────────────────────────

export interface ProfileSignals {
  verifiedItems: number;
  needsConfirmation: number;
  drafts: number;
  storiesReady: number;
  storiesTotal: number;
  eligibility: { complete: boolean; label: string };
}

function countStatus(status: VerificationStatus, profile: CareerProfile): number {
  let n = 0;
  const records: { verificationStatus: VerificationStatus }[] = [
    ...profile.experiences,
    ...profile.education,
    ...profile.researchProjects,
    ...profile.skills,
    ...profile.achievements,
    ...profile.careerStories,
  ];
  n += records.filter((r) => r.verificationStatus === status).length;
  for (const e of profile.experiences) {
    n += e.responsibilities.filter((c) => c.verificationStatus === status &&
      (status !== "verified" || e.verificationStatus === "verified")).length;
  }
  for (const p of profile.researchProjects) {
    n += p.outcomes.filter((c) => c.verificationStatus === status &&
      (status !== "verified" || p.verificationStatus === "verified")).length;
  }
  return n;
}

export function getProfileSignals(profile: CareerProfile): ProfileSignals {
  const known = profile.workAuthorizations.filter(
    (w) => currentAuthorization(w, new Date())
  );
  return {
    verifiedItems: countStatus("verified", profile),
    needsConfirmation: countStatus("needs_confirmation", profile),
    drafts: countStatus("draft", profile),
    storiesReady: profile.careerStories.filter((s) => s.verificationStatus === "verified").length,
    storiesTotal: profile.careerStories.length,
    eligibility:
      known.length > 0
        ? { complete: true, label: "Work authorization recorded" }
        : { complete: false, label: "Work authorization incomplete" },
  };
}

// ── Section status ──────────────────────────────────────────────────────────

export interface SectionStatus {
  id: Exclude<SectionId, "overview">;
  count: number;
  unconfirmed: number;
  drafts: number;
  state: "ready" | "attention" | "empty";
  note: string;
}

function summarise(
  id: SectionStatus["id"],
  records: { verificationStatus: VerificationStatus }[],
  claims: ProfileClaim[]
): SectionStatus {
  const unconfirmed =
    records.filter((r) => r.verificationStatus === "needs_confirmation").length +
    claims.filter((c) => c.verificationStatus === "needs_confirmation").length;
  const drafts =
    records.filter((r) => r.verificationStatus === "draft").length +
    claims.filter((c) => c.verificationStatus === "draft").length;

  if (records.length === 0) {
    return { id, count: 0, unconfirmed: 0, drafts: 0, state: "empty", note: "Nothing added yet" };
  }
  const parts: string[] = [];
  if (unconfirmed) parts.push(`${unconfirmed} to confirm`);
  if (drafts) parts.push(`${drafts} draft${drafts === 1 ? "" : "s"}`);
  return {
    id,
    count: records.length,
    unconfirmed,
    drafts,
    state: unconfirmed || drafts ? "attention" : "ready",
    note: parts.length ? parts.join(" · ") : "All verified",
  };
}

export function getSectionStatuses(profile: CareerProfile): SectionStatus[] {
  const statuses: SectionStatus[] = [
    summarise(
      "experience",
      profile.experiences,
      profile.experiences.flatMap((e) => e.responsibilities)
    ),
    summarise("education", profile.education, []),
    summarise(
      "research",
      profile.researchProjects,
      profile.researchProjects.flatMap((p) => p.outcomes)
    ),
    summarise("skills", profile.skills, []),
    summarise("achievements", profile.achievements, []),
    summarise("stories", profile.careerStories, []),
  ];

  const signals = getProfileSignals(profile);
  const prefs = profile.preferences;
  const prefCount =
    prefs.targetRoles.length +
    prefs.industries.length +
    prefs.preferredLocations.length +
    prefs.workStyles.length +
    prefs.employmentTypes.length +
    prefs.seniority.length;
  const prefIssues: string[] = [];
  if (!signals.eligibility.complete) prefIssues.push("Work authorization incomplete");
  if (prefs.targetRoles.length === 0) prefIssues.push("No target roles");
  statuses.push({
    id: "preferences",
    count: prefCount + profile.workAuthorizations.length,
    unconfirmed: 0,
    drafts: 0,
    state:
      prefCount + profile.workAuthorizations.length === 0
        ? "empty"
        : prefIssues.length
          ? "attention"
          : "ready",
    note: prefIssues.length ? prefIssues.join(" · ") : "Complete",
  });
  return statuses;
}

/** Re-exported for convenience of callers that already import selectors. */
export { getRecordClaims };
export type { EvidenceRecord };
