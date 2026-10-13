import type {
  ApplicationAnalysisSnapshot, ApplicationEvidenceSnapshot, ApplicationRecord, ApplicationStatus,
} from "@/types/application";
import type { JobAnalysis, JobPosting, JobRequirementSpec } from "@/types/analysis";
import type { CareerProfile, EvidenceLink, ProfileSource } from "@/types/profile";
import { normalizeCareerProfile, normalizeProfileRecord, createRecoveryProfile } from "@/lib/profile/validation";
import { resolveEvidenceLink } from "@/lib/profile/evidence";
import { getWorkAuthorizationForRegions, workAuthorizationToEligibility } from "@/lib/profile/selectors";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { calculateFit, evaluateCriticalRequirements } from "@/lib/analysis/scoring";
import { determineRecommendation } from "@/lib/analysis/recommendation";

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "Saved", "Preparing", "Ready to Apply", "Applied", "Assessment", "Interview", "Rejected", "Offer", "Withdrawn", "Skipped",
];
const IMPORTANCE = ["critical", "core", "preferred", "contextual"];
const CATEGORIES = ["education", "experience", "skill", "industry", "language", "location", "work_authorization", "certification", "license", "seniority", "other"];
const SOURCES: ProfileSource[] = ["user", "cv_import", "application", "suggested"];
const RECORD_TYPES = ["experience", "education", "research_project", "achievement", "career_story"];
const DOCUMENT_STATUSES = ["Not started", "In progress", "Complete"];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string { return typeof value === "string"; }
function nonempty(value: unknown): value is string { return text(value) && value.trim().length > 0; }
function member(value: unknown, values: string[]): value is string { return text(value) && values.includes(value); }
function date(value: unknown): value is string { return nonempty(value) && Number.isFinite(Date.parse(value)); }
function optionalText(value: Record<string, unknown>, names: string[]) {
  return names.every((name) => value[name] === undefined || text(value[name]));
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
  return value;
}
function same(a: unknown, b: unknown): boolean { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
function link(value: unknown): value is EvidenceLink {
  return object(value) && member(value.recordType, RECORD_TYPES) && nonempty(value.recordId)
    && (value.claimId === undefined || nonempty(value.claimId));
}
function linkKey(value: EvidenceLink) { return JSON.stringify([value.recordType, value.recordId, value.claimId ?? null]); }
function cleanLink(value: EvidenceLink): EvidenceLink {
  return { recordType: value.recordType, recordId: value.recordId, ...(value.claimId === undefined ? {} : { claimId: value.claimId }) };
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

/** Strip all candidate evidence and local overrides from employer-side input. */
export function normalizeJobPosting(input: unknown): JobPosting | null {
  if (!object(input) || !nonempty(input.id) || !nonempty(input.company) || !nonempty(input.role)
    || !text(input.location) || !optionalText(input, ["sourceUrl", "rawDescription"]) || !Array.isArray(input.requirements)) return null;
  if (input.sourceUrl) {
    try { if (!["http:", "https:"].includes(new URL(input.sourceUrl as string).protocol)) return null; }
    catch { return null; }
  }
  const requirements: JobRequirementSpec[] = [];
  const ids = new Set<string>();
  for (const item of input.requirements) {
    if (!object(item) || !nonempty(item.id) || ids.has(item.id) || !nonempty(item.label)
      || !member(item.importance, IMPORTANCE) || !member(item.category, CATEGORIES)
      || !optionalText(item, ["description", "sourceText", "rationale", "confirmationQuestion"])
      || (item.isHardBlocker !== undefined && typeof item.isHardBlocker !== "boolean")) return null;
    ids.add(item.id);
    if (item.profileMatches !== undefined && (!Array.isArray(item.profileMatches) || !item.profileMatches.every((match) =>
      object(match) && link(match.link) && member(match.relevance, ["direct", "adjacent"])))) return null;
    if (Array.isArray(item.profileMatches) && new Set(item.profileMatches.map((match) => linkKey(match.link))).size !== item.profileMatches.length) return null;
    if (item.eligibility !== undefined && (!object(item.eligibility)
      || !Array.isArray(item.eligibility.acceptedRegions) || !item.eligibility.acceptedRegions.every(nonempty)
      || (typeof item.eligibility.sponsorshipAvailable !== "boolean" && item.eligibility.sponsorshipAvailable !== null))) return null;
    if (item.notes !== undefined && (!object(item.notes) || !optionalText(item.notes, ["partial", "none"]))) return null;
    const requirement: Record<string, unknown> = { id: item.id, label: item.label, importance: item.importance, category: item.category };
    for (const name of ["description", "sourceText", "rationale", "confirmationQuestion", "isHardBlocker"]) {
      if (item[name] !== undefined) requirement[name] = clone(item[name]);
    }
    if (Array.isArray(item.profileMatches)) requirement.profileMatches = item.profileMatches.map((match) => ({ link: cleanLink(match.link), relevance: match.relevance }));
    if (object(item.eligibility)) requirement.eligibility = { acceptedRegions: [...item.eligibility.acceptedRegions as string[]], sponsorshipAvailable: item.eligibility.sponsorshipAvailable };
    if (object(item.notes)) requirement.notes = Object.fromEntries(["partial", "none"].filter((key) => item.notes && (item.notes as Record<string, unknown>)[key] !== undefined)
      .map((key) => [key, (item.notes as Record<string, unknown>)[key]]));
    requirements.push(requirement as unknown as JobRequirementSpec);
  }
  return { id: input.id, company: input.company, role: input.role, location: input.location,
    ...(input.sourceUrl === undefined ? {} : { sourceUrl: input.sourceUrl as string }),
    ...(input.rawDescription === undefined ? {} : { rawDescription: input.rawDescription as string }), requirements };
}

/** A content fingerprint for detecting stale assessments, not an authentication token. */
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

export function getLatestSnapshot(record: ApplicationRecord): ApplicationAnalysisSnapshot {
  return record.snapshots[record.snapshots.length - 1];
}

/** Time-dependent eligibility can change even when Profile bytes stay the same. */
export function isApplicationAnalysisStale(record: ApplicationRecord, profile: CareerProfile, now = new Date()): boolean {
  const latest = getLatestSnapshot(record);
  return latest.profileRevision !== getProfileRevision(profile)
    || !same(latest.analysis.criticalIssues, buildJobAnalysis({ job: record.job, profile, now }).criticalIssues);
}

function createSnapshot(job: JobPosting, profile: CareerProfile, now: string): ApplicationAnalysisSnapshot {
  const baseline = buildJobAnalysis({ job, profile, now: new Date(now) });
  const evidence = new Map<string, ApplicationEvidenceSnapshot>();
  const unconfirmedEvidence = new Map<string, ApplicationAnalysisSnapshot["unconfirmedEvidence"][number]>();
  for (const requirement of baseline.requirements) {
    for (const match of requirement.profileMatches ?? []) {
      const resolved = resolveEvidenceLink(profile, match.link);
      if (!resolved) continue;
      if (!resolved.usable) {
        unconfirmedEvidence.set(linkKey(match.link), { link: clone(match.link), verificationStatus: resolved.status as "needs_confirmation" | "draft" });
        continue;
      }
      const collection = match.link.recordType === "experience" ? profile.experiences
        : match.link.recordType === "education" ? profile.education
        : match.link.recordType === "research_project" ? profile.researchProjects
        : match.link.recordType === "achievement" ? profile.achievements : profile.careerStories;
      const record = collection.find((item) => item.id === resolved.recordId)!;
      evidence.set(linkKey(match.link), {
        link: clone(match.link), recordTitle: resolved.recordTitle, sourceOrganization: resolved.organization,
        excerpt: resolved.excerpt, source: resolved.claim?.source ?? record.source,
        sourceRecordId: resolved.claim?.sourceRecordId, derivedFromClaimId: resolved.claim?.derivedFromClaimId,
        recordUpdatedAt: record.updatedAt, verificationStatus: "verified",
      });
    }
  }
  // Pending facts affect confidence, but their unconfirmed prose is not saved as an application claim.
  const analysis: JobAnalysis = { ...baseline, requirements: baseline.requirements.map((requirement) => ({
    ...requirement, evidence: requirement.evidence?.filter((item) => item.status === "verified" && item.link),
  })) };
  return clone({ id: `assessment-${crypto.randomUUID()}`, capturedAt: now, profileRevision: getProfileRevision(profile),
    profileUpdatedAt: profile.updatedAt, analysis, evidence: [...evidence.values()], unconfirmedEvidence: [...unconfirmedEvidence.values()], authorizations: profile.workAuthorizations });
}

export function createApplicationRecord({ id, job, profile, status = "Saved", reason, now = new Date().toISOString() }: {
  id: string; job: JobPosting; profile: CareerProfile; status?: "Saved" | "Preparing" | "Skipped"; reason?: string; now?: string;
}): ApplicationRecord | null {
  const source = normalizeCareerProfile(profile);
  const posting = normalizeJobPosting(job);
  if (!nonempty(id) || !source || !posting || !date(now) || !["Saved", "Preparing", "Skipped"].includes(status)
    || (reason !== undefined && !text(reason))) return null;
  now = new Date(now).toISOString();
  const snapshot = createSnapshot(posting, source, now);
  return clone({
    id, profileId: source.id, job: posting, company: posting.company, role: posting.role, location: posting.location,
    fitScore: snapshot.analysis.overallFit, recommendation: snapshot.analysis.recommendation,
    status, createdAt: now, updatedAt: now, snapshots: [snapshot], statusHistory: [{ status, changedAt: now, ...(reason ? { reason } : {}) }],
    cvStatus: "Not started", coverLetterStatus: "Not started", questionsCompleted: 0, questionsTotal: 0,
    jobUrl: posting.sourceUrl, jobDescription: posting.rawDescription,
    ...(status === "Skipped" && reason ? { skipReason: reason } : {}),
  });
}

export function refreshApplicationRecord(record: ApplicationRecord, profile: CareerProfile, now = new Date().toISOString()): ApplicationRecord | null {
  const source = normalizeCareerProfile(profile);
  if (!source || source.id !== record.profileId || !date(now)) return null;
  now = new Date(now).toISOString();
  if (Date.parse(now) < Date.parse(record.updatedAt)) return null;
  if (!isApplicationAnalysisStale(record, source, new Date(now))) return record;
  const snapshot = createSnapshot(record.job, source, now);
  return clone({ ...record, snapshots: [...record.snapshots, snapshot], fitScore: snapshot.analysis.overallFit,
    recommendation: snapshot.analysis.recommendation, updatedAt: now });
}

export function changeApplicationStatus(record: ApplicationRecord, status: ApplicationStatus, reason?: string, now = new Date().toISOString()): ApplicationRecord {
  if (!APPLICATION_STATUSES.includes(status) || !date(now) || (reason !== undefined && !text(reason))) return record;
  if (record.status === status && (status !== "Skipped" || record.skipReason === reason)) return record;
  return clone({ ...record, status, updatedAt: now, skipReason: status === "Skipped" ? reason : undefined,
    statusHistory: [...record.statusHistory, { status, changedAt: now, ...(reason ? { reason } : {}) }] });
}

function normalizeSnapshot(input: unknown, job: JobPosting, profileId: string): ApplicationAnalysisSnapshot | null {
  if (!object(input) || !nonempty(input.id) || !date(input.capturedAt) || !date(input.profileUpdatedAt)
    || !nonempty(input.profileRevision) || !object(input.analysis) || !Array.isArray(input.evidence)
    || !Array.isArray(input.authorizations) || !Array.isArray(input.unconfirmedEvidence)
    || !input.profileRevision.startsWith(`${profileId}:${input.profileUpdatedAt}:`)) return null;
  const archive = new Map<string, ApplicationEvidenceSnapshot>();
  for (const item of input.evidence) {
    if (!object(item) || !link(item.link) || !nonempty(item.recordTitle) || !text(item.excerpt)
      || !SOURCES.includes(item.source as ProfileSource) || item.verificationStatus !== "verified"
      || !date(item.recordUpdatedAt) || !optionalText(item, ["sourceOrganization"])
      || (item.sourceRecordId !== undefined && !nonempty(item.sourceRecordId))
      || (item.derivedFromClaimId !== undefined && !nonempty(item.derivedFromClaimId))) return null;
    const key = linkKey(item.link);
    if (archive.has(key)) return null;
    archive.set(key, clone(item) as unknown as ApplicationEvidenceSnapshot);
  }
  const unconfirmed = new Set<string>();
  const matchKeys = new Set(job.requirements.flatMap((spec) => spec.profileMatches?.map((match) => linkKey(match.link)) ?? []));
  for (const item of input.unconfirmedEvidence) {
    if (!object(item) || !link(item.link) || !same(item.link, cleanLink(item.link))
      || Object.keys(item).some((key) => !["link", "verificationStatus"].includes(key))
      || !member(item.verificationStatus, ["needs_confirmation", "draft"])) return null;
    const key = linkKey(item.link);
    if (!matchKeys.has(key) || archive.has(key) || unconfirmed.has(key)) return null;
    unconfirmed.add(key);
  }
  if (!input.authorizations.every((item) => object(item) && SOURCES.includes(item.source as ProfileSource)
    && member(item.verificationStatus, ["verified", "needs_confirmation", "draft"]) && date(item.createdAt) && date(item.updatedAt))) return null;
  const authorizations = input.authorizations.map((item) => normalizeProfileRecord("workAuthorizations", item));
  if (authorizations.some((item) => !item) || new Set(authorizations.map((item) => item!.id)).size !== authorizations.length) return null;
  const analysis = input.analysis;
  if (analysis.id !== job.id || analysis.company !== job.company || analysis.role !== job.role
    || analysis.location !== job.location || analysis.createdAt !== input.capturedAt
    || analysis.sourceUrl !== job.sourceUrl || analysis.rawDescription !== job.rawDescription
    || !Array.isArray(analysis.requirements) || analysis.requirements.length !== job.requirements.length) return null;
  const requirements = [];
  const eligibilityProfile = { ...createRecoveryProfile(), workAuthorizations: authorizations as CareerProfile["workAuthorizations"] };
  const used = new Set<string>();
  for (let i = 0; i < job.requirements.length; i++) {
    const candidate = analysis.requirements[i];
    const spec = job.requirements[i];
    if (!object(candidate) || candidate.userOverride !== undefined
      || !member(candidate.evidenceStrength, ["strong", "partial", "none", "needs_confirmation"])) return null;
    const base = { ...spec };
    delete base.notes;
    const candidateBase = { ...candidate };
    for (const name of ["evidenceStrength", "criticalStatus", "evidence", "userOverride"]) delete candidateBase[name];
    // Rationale may be the deterministic note derived for an absent/adjacent match.
    const expectedRationale = spec.importance === "critical" ? spec.rationale
      : spec.notes?.[candidate.evidenceStrength as "partial" | "none"] ?? spec.rationale;
    if (expectedRationale !== undefined) base.rationale = expectedRationale;
    if (!same(candidateBase, clone(base))) return null;
    if (candidate.evidence !== undefined && !Array.isArray(candidate.evidence)) return null;
    const candidateKeys = new Set<string>();
    for (const item of (candidate.evidence ?? []) as unknown[]) {
      if (!object(item) || !link(item.link) || item.status !== "verified" || !nonempty(item.id)) return null;
      const proof = archive.get(linkKey(item.link));
      const match = spec.profileMatches?.find((entry) => linkKey(entry.link) === linkKey(item.link as EvidenceLink));
      const sourceType = item.link.recordType === "research_project" ? "research" : item.link.recordType === "career_story" ? "experience" : item.link.recordType;
      if (!proof || !match || candidateKeys.has(linkKey(item.link)) || item.sourceType !== sourceType
        || item.id !== `ev-${item.link.recordId}-${item.link.claimId ?? "rec"}` || item.evidenceText !== proof.excerpt || item.sourceTitle !== proof.recordTitle
        || item.sourceOrganization !== proof.sourceOrganization || item.strength !== (match.relevance === "direct" ? "strong" : "partial")) return null;
      used.add(linkKey(item.link));
      candidateKeys.add(linkKey(item.link));
    }
    const verified = spec.profileMatches?.filter((entry) => archive.has(linkKey(entry.link))) ?? [];
    if (verified.some((entry) => !candidateKeys.has(linkKey(entry.link)))) return null;
    const derived = verified.some((entry) => entry.relevance === "direct") ? "strong"
      : verified.length ? "partial" : spec.profileMatches?.some((entry) => unconfirmed.has(linkKey(entry.link))) ? "needs_confirmation" : "none";
    if (spec.importance === "critical") {
      const status = spec.eligibility
        ? workAuthorizationToEligibility(getWorkAuthorizationForRegions(eligibilityProfile, spec.eligibility.acceptedRegions, new Date(input.capturedAt)),
          { sponsorshipAvailable: spec.eligibility.sponsorshipAvailable, now: new Date(input.capturedAt) })
        : derived === "strong" ? "satisfied" : "needs_confirmation";
      if (candidate.criticalStatus !== status || candidate.evidenceStrength !== (status === "satisfied" ? "strong" : status === "unmet" ? "none" : "needs_confirmation")) return null;
    } else if (candidate.evidenceStrength !== derived || candidate.criticalStatus !== undefined) return null;
    requirements.push(candidate as unknown as JobAnalysis["requirements"][number]);
  }
  if ([...archive.keys()].some((key) => !used.has(key))) return null;
  const metrics = calculateFit(requirements);
  const gates = evaluateCriticalRequirements(requirements);
  const outcome = determineRecommendation(metrics, gates, requirements);
  for (const [key, value] of Object.entries(metrics)) if (analysis[key] !== value) return null;
  if (!same(analysis.criticalIssues, gates) || !same(analysis.strengths, outcome.strengths)
    || !same(analysis.manageableGaps, outcome.manageableGaps) || analysis.recommendation !== outcome.recommendation
    || analysis.recommendationReason !== outcome.recommendationReason || analysis.bamiTake !== outcome.bamiTake) return null;
  return clone(input) as unknown as ApplicationAnalysisSnapshot;
}

export function normalizeApplications(input: unknown): ApplicationRecord[] | null {
  if (!Array.isArray(input)) return null;
  const records: ApplicationRecord[] = [];
  const identities = new Set<string>();
  const ids = new Set<string>();
  for (const item of input) {
    if (!object(item) || !nonempty(item.id) || ids.has(item.id) || !nonempty(item.profileId)
      || !date(item.createdAt) || !date(item.updatedAt) || !APPLICATION_STATUSES.includes(item.status as ApplicationStatus)
      || !member(item.cvStatus, DOCUMENT_STATUSES) || !member(item.coverLetterStatus, DOCUMENT_STATUSES)
      || !Number.isInteger(item.questionsCompleted) || !Number.isInteger(item.questionsTotal)
      || Number(item.questionsCompleted) < 0 || Number(item.questionsTotal) < Number(item.questionsCompleted)
      || !optionalText(item, ["skipReason", "jobUrl", "jobDescription"]) || !Array.isArray(item.snapshots) || !item.snapshots.length
      || !Array.isArray(item.statusHistory) || !item.statusHistory.length) return null;
    const job = normalizeJobPosting(item.job);
    if (!job || !same(item.job, job) || item.company !== job.company || item.role !== job.role || item.location !== job.location
      || item.jobUrl !== job.sourceUrl || item.jobDescription !== job.rawDescription) return null;
    const identity = JSON.stringify([item.profileId, job.id]);
    if (identities.has(identity)) return null;
    const snapshots = item.snapshots.map((snapshot) => normalizeSnapshot(snapshot, job, item.profileId as string));
    if (snapshots.some((snapshot) => !snapshot) || new Set(snapshots.map((snapshot) => snapshot!.id)).size !== snapshots.length) return null;
    const latest = snapshots[snapshots.length - 1]!;
    if (item.fitScore !== latest.analysis.overallFit || item.recommendation !== latest.analysis.recommendation) return null;
    let previous = Date.parse(item.createdAt);
    for (const snapshot of snapshots) {
      if (Date.parse(snapshot!.capturedAt) < previous || Date.parse(snapshot!.capturedAt) > Date.parse(item.updatedAt)) return null;
      previous = Date.parse(snapshot!.capturedAt);
    }
    previous = Date.parse(item.createdAt);
    for (const event of item.statusHistory) {
      if (!object(event) || !APPLICATION_STATUSES.includes(event.status as ApplicationStatus) || !date(event.changedAt)
        || !optionalText(event, ["reason"]) || Date.parse(event.changedAt) < previous || Date.parse(event.changedAt) > Date.parse(item.updatedAt)) return null;
      previous = Date.parse(event.changedAt);
    }
    const last = item.statusHistory[item.statusHistory.length - 1];
    if (last.status !== item.status || (item.status === "Skipped" ? item.skipReason !== last.reason : item.skipReason !== undefined)) return null;
    ids.add(item.id); identities.add(identity);
    records.push(clone(item) as unknown as ApplicationRecord);
  }
  return records;
}
