import type { JobPosting } from "@/types/analysis";
import type { CVCandidate, CVContent, CVEntry, CVSelection, CVVersion } from "@/types/cv";
import type { CareerProfile, EvidenceLink, EvidenceRecordType, ProfileClaim, RecordMeta } from "@/types/profile";
import { findEvidenceRecord, getRecordClaims, linkKey, resolveEvidenceLink } from "@/lib/profile/evidence";
import { getProfileRevision } from "@/lib/profile/revision";
import { getEvidenceForSkill } from "@/lib/profile/selectors";
import { profileHref } from "@/lib/profile/sections";
import { normalizeCareerProfile } from "@/lib/profile/validation";

export interface CVApplicationContext {
  id: string;
  profileId: string;
  job: Pick<JobPosting, "id">;
  company: string;
  role: string;
}

const TYPES: EvidenceRecordType[] = ["experience", "education", "research_project", "achievement", "career_story"];
const SECTION_TITLES: Record<EvidenceRecordType, string> = {
  experience: "Experience", education: "Education", research_project: "Research & Projects",
  achievement: "Achievements", career_story: "Career Highlights",
};
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function validLink(value: unknown): value is EvidenceLink {
  return object(value) && TYPES.includes(value.recordType as EvidenceRecordType) && nonempty(value.recordId)
    && (value.claimId === undefined || nonempty(value.claimId))
    && Object.keys(value).every((key) => ["recordType", "recordId", "claimId"].includes(key));
}
function selection(input: unknown): CVSelection | null {
  if (!object(input) || Object.keys(input).some((key) => !["evidence", "skillIds"].includes(key))
    || !Array.isArray(input.evidence) || !input.evidence.every(validLink)
    || !Array.isArray(input.skillIds) || !input.skillIds.every(nonempty)
    || new Set(input.evidence.map(linkKey)).size !== input.evidence.length
    || new Set(input.skillIds).size !== input.skillIds.length) return null;
  return clone({ evidence: input.evidence, skillIds: input.skillIds });
}
function meta(record: RecordMeta): RecordMeta {
  return { source: record.source, verificationStatus: record.verificationStatus, createdAt: record.createdAt, updatedAt: record.updatedAt };
}
function pick<T extends object, K extends keyof T>(record: T, fields: K[]): Pick<T, K> {
  return Object.fromEntries(fields.filter((key) => record[key] !== undefined).map((key) => [key, record[key]])) as Pick<T, K>;
}
function cleanClaim(claim: ProfileClaim): ProfileClaim {
  return pick(claim, ["id", "text", "verificationStatus", "source", "sourceRecordId", "derivedFromClaimId"]);
}
function records(profile: CareerProfile, type: EvidenceRecordType) {
  return type === "experience" ? profile.experiences : type === "education" ? profile.education
    : type === "research_project" ? profile.researchProjects : type === "achievement" ? profile.achievements : profile.careerStories;
}

/** Only explicitly linked employer requirements label a candidate as relevant. */
function labelsFor(links: EvidenceLink[], job: JobPosting): string[] {
  const keys = new Set(links.map(linkKey));
  return [...new Set(job.requirements.filter((requirement) => requirement.profileMatches?.some((match) => keys.has(linkKey(match.link))))
    .map((requirement) => requirement.label))];
}

export function getCVCandidates(profile: CareerProfile, job: JobPosting): CVCandidate[] {
  const source = normalizeCareerProfile(profile);
  if (!source) return [];
  const candidates: CVCandidate[] = [];
  for (const type of TYPES) {
    for (const record of records(source, type)) {
      if (record.verificationStatus !== "verified") continue;
      const links: EvidenceLink[] = [{ recordType: type, recordId: record.id },
        ...getRecordClaims(type, record).filter((claim) => claim.verificationStatus === "verified")
          .map((claim) => ({ recordType: type, recordId: record.id, claimId: claim.id }))];
      for (const link of links) {
        const resolved = resolveEvidenceLink(source, link);
        if (!resolved?.usable) continue;
        candidates.push({ id: linkKey(link), kind: type,
          label: `${resolved.recordTitle}${resolved.organization ? ` · ${resolved.organization}` : ""}`,
          text: resolved.excerpt, href: resolved.href, matchedRequirementLabels: labelsFor([link], job), evidenceLink: link });
      }
    }
  }
  for (const skill of source.skills) {
    const proof = getEvidenceForSkill(source, skill.id);
    if (skill.verificationStatus !== "verified" || proof.length === 0) continue;
    candidates.push({ id: `skill:${skill.id}`, kind: "skill", label: skill.name, text: skill.name,
      href: profileHref("skills", skill.id), matchedRequirementLabels: labelsFor(proof.map((item) => item.link), job), skillId: skill.id });
  }
  return candidates.sort((a, b) => Number(b.matchedRequirementLabels.length > 0) - Number(a.matchedRequirementLabels.length > 0));
}

export function getDefaultCVSelection(profile: CareerProfile, job: JobPosting): CVSelection {
  const candidates = getCVCandidates(profile, job);
  const hasMatches = candidates.some((candidate) => candidate.matchedRequirementLabels.length > 0);
  const chosen = hasMatches ? candidates.filter((candidate) => candidate.matchedRequirementLabels.length > 0 || candidate.kind === "education") : candidates;
  return { evidence: chosen.flatMap((candidate) => candidate.evidenceLink ? [clone(candidate.evidenceLink)] : []),
    skillIds: chosen.flatMap((candidate) => candidate.skillId ? [candidate.skillId] : []) };
}

/** Build the minimal verified source archive needed to recreate this selection. */
function sourceArchive(profile: CareerProfile, requested: CVSelection): CareerProfile | null {
  const source = normalizeCareerProfile(profile);
  const selected = selection(requested);
  if (!source || !selected || source.personal.verificationStatus !== "verified" || !nonempty(source.personal.name)) return null;
  if (!selected.evidence.every((link) => resolveEvidenceLink(source, link)?.usable)) return null;
  const selectedSkills = selected.skillIds.map((id) => source.skills.find((skill) => skill.id === id));
  if (selectedSkills.some((skill) => !skill || skill.verificationStatus !== "verified" || getEvidenceForSkill(source, skill.id).length === 0)) return null;
  const proof = [...selected.evidence, ...selected.skillIds.flatMap((id) => getEvidenceForSkill(source, id).map((item) => item.link))];
  const wanted = (type: EvidenceRecordType, id: string) => proof.some((link) => link.recordType === type && link.recordId === id);
  const claims = (type: EvidenceRecordType, id: string, values: ProfileClaim[]) => {
    const record = type === "experience" ? source.experiences.find((item) => item.id === id) : undefined;
    const fallback = record && !record.summary && proof.some((link) => link.recordType === type && link.recordId === id && !link.claimId)
      ? values.find((claim) => claim.verificationStatus === "verified")?.id : undefined;
    return values.filter((claim) => claim.verificationStatus === "verified" && (claim.id === fallback
      || proof.some((link) => link.recordType === type && link.recordId === id && link.claimId === claim.id))).map(cleanClaim);
  };
  const archive: CareerProfile = {
    id: source.id, updatedAt: source.updatedAt,
    personal: { ...meta(source.personal), ...pick(source.personal, ["name", "headline", "location", "email", "phone", "linkedin", "website"]) },
    experiences: source.experiences.filter((record) => wanted("experience", record.id)).map((record) => ({ ...meta(record),
      ...pick(record, ["id", "title", "organization", "location", "startDate", "endDate", "isCurrent", "employmentType", "summary"]),
      responsibilities: claims("experience", record.id, record.responsibilities), achievementIds: [], skillIds: [] })),
    education: source.education.filter((record) => wanted("education", record.id)).map((record) => ({ ...meta(record),
      ...pick(record, ["id", "institution", "degree", "fieldOfStudy", "startDate", "endDate", "isCurrent", "location", "grade", "thesisTitle", "coursework", "notes"]) })),
    researchProjects: source.researchProjects.filter((record) => wanted("research_project", record.id)).map((record) => ({ ...meta(record),
      ...pick(record, ["id", "title", "projectType", "organization", "startDate", "endDate", "summary", "objective", "role", "methods", "technologies", "links"]),
      outcomes: claims("research_project", record.id, record.outcomes), skillIds: [] })),
    skills: selectedSkills.map((skill) => ({ ...meta(skill!), ...pick(skill!, ["id", "name", "category", "level"]),
      evidenceLinks: getEvidenceForSkill(source, skill!.id).map((item) => clone(item.link)) })),
    achievements: source.achievements.filter((record) => wanted("achievement", record.id)).map((record) => ({ ...meta(record),
      ...pick(record, ["id", "title", "description", "metric", "linkedRecordType", "linkedRecordId", "date", "notes"]) })),
    careerStories: source.careerStories.filter((record) => wanted("career_story", record.id)).map((record) => ({ ...meta(record),
      ...pick(record, ["id", "title", "context", "challenge", "actions", "outcome", "demonstrates", "usefulFor"]), skillIds: [], evidenceLinks: [] })),
    workAuthorizations: [],
    preferences: { targetRoles: [], industries: [], preferredLocations: [], workStyles: [], employmentTypes: [], seniority: [], updatedAt: source.updatedAt },
  };
  return clone(archive);
}

function dates(record: { startDate?: string; endDate?: string; isCurrent?: boolean }): string | undefined {
  const end = record.isCurrent ? "Present" : record.endDate;
  return record.startDate && end ? `${record.startDate} – ${end}` : record.startDate || end;
}
function present(values: (string | undefined)[]): string[] { return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0); }

function contentFromArchive(profile: CareerProfile, selected: CVSelection): CVContent {
  const sections: CVContent["sections"] = [];
  for (const type of TYPES) {
    const links = selected.evidence.filter((link) => link.recordType === type);
    const ids = [...new Set(links.map((link) => link.recordId))];
    const entries: CVEntry[] = ids.map((id) => {
      const record = findEvidenceRecord(profile, type, id)!;
      const evidence = links.filter((link) => link.recordId === id);
      const includeDetails = evidence.some((link) => !link.claimId);
      const bullets = evidence.flatMap((link) => link.claimId ? [resolveEvidenceLink(profile, link)!.excerpt] : []);
      const base: CVEntry = { id: `${type}:${id}`, title: "", paragraphs: [], bullets, evidence: clone(evidence) };
      if (type === "experience") {
        const experience = profile.experiences.find((item) => item.id === id)!;
        const excerpt = experience.summary || experience.responsibilities.find((claim) => claim.verificationStatus === "verified")?.text;
        return { ...base, title: experience.title, subtitle: experience.organization, location: experience.location,
          dates: dates(experience), paragraphs: includeDetails && !bullets.includes(excerpt ?? "") ? present([excerpt]) : [] };
      }
      if (type === "education") {
        const education = profile.education.find((item) => item.id === id)!;
        return { ...base, title: `${education.degree}, ${education.fieldOfStudy}`, subtitle: education.institution, location: education.location,
          dates: dates(education), paragraphs: present([education.grade, education.thesisTitle, education.notes]), bullets: education.coursework ?? [] };
      }
      if (type === "research_project") {
        const project = profile.researchProjects.find((item) => item.id === id)!;
        return { ...base, title: project.title, subtitle: project.organization, dates: dates(project),
          paragraphs: includeDetails ? present([project.role, project.summary, project.objective]) : [],
          bullets: includeDetails ? [...project.methods, ...project.technologies, ...bullets] : bullets };
      }
      if (type === "achievement") {
        const achievement = profile.achievements.find((item) => item.id === id)!;
        return { ...base, title: achievement.title, dates: achievement.date,
          paragraphs: present([achievement.description, achievement.metric?.value, achievement.metric?.context, achievement.notes]) };
      }
      const story = profile.careerStories.find((item) => item.id === record.id)!;
      return { ...base, title: story.title, paragraphs: present([story.context, story.challenge, story.outcome]), bullets: story.actions };
    });
    if (entries.length) sections.push({ id: type, title: SECTION_TITLES[type], entries });
  }
  return clone({ personal: pick(profile.personal, ["name", "headline", "location", "email", "phone", "linkedin", "website"]), sections,
    skills: selected.skillIds.map((id) => ({ id, name: profile.skills.find((skill) => skill.id === id)!.name,
      evidence: getEvidenceForSkill(profile, id).map((item) => clone(item.link)) })) });
}

export function buildCVContent(profile: CareerProfile, selected: CVSelection): CVContent | null {
  const archive = sourceArchive(profile, selected);
  if (!archive || selected.evidence.length === 0) return null;
  return contentFromArchive(archive, selected);
}

export function createCVVersion({ id, application, profile, selection: selected, status, now = new Date().toISOString() }: {
  id: string; application: CVApplicationContext; profile: CareerProfile; selection: CVSelection;
  status: CVVersion["status"]; now?: string;
}): CVVersion | null {
  if (!nonempty(id) || !nonempty(application.id) || !nonempty(application.profileId) || !nonempty(application.job.id)
    || !nonempty(application.company) || !nonempty(application.role) || application.profileId !== profile.id
    || !["draft", "reviewed"].includes(status) || !nonempty(now) || !Number.isFinite(Date.parse(now))) return null;
  const archive = sourceArchive(profile, selected);
  if (!archive || selected.evidence.length === 0) return null;
  const content = contentFromArchive(archive, selected);
  return clone({ schemaVersion: 1, id, applicationId: application.id, profileId: application.profileId, jobId: application.job.id,
    company: application.company, role: application.role, createdAt: new Date(now).toISOString(), status, selection: selected,
    sourceProfile: archive, profileRevision: getProfileRevision(archive), content });
}

export function normalizeCVVersions(input: unknown, application: CVApplicationContext): CVVersion[] | null {
  if (!Array.isArray(input)) return null;
  const result: CVVersion[] = [];
  const ids = new Set<string>();
  let previousDate = -Infinity;
  for (const value of input) {
    if (!object(value) || value.schemaVersion !== 1 || !nonempty(value.id) || ids.has(value.id)
      || value.applicationId !== application.id || value.profileId !== application.profileId || value.jobId !== application.job.id
      || value.company !== application.company || value.role !== application.role || !nonempty(value.createdAt)
      || !Number.isFinite(Date.parse(value.createdAt))
      || new Date(value.createdAt).toISOString() !== value.createdAt || Date.parse(value.createdAt) < previousDate
      || !["draft", "reviewed"].includes(value.status as string)) return null;
    const selected = selection(value.selection);
    const source = normalizeCareerProfile(value.sourceProfile);
    if (!selected || !source) return null;
    const rebuilt = createCVVersion({ id: value.id, application, profile: source, selection: selected,
      status: value.status as CVVersion["status"], now: value.createdAt });
    if (!rebuilt || canonical(rebuilt) !== canonical(value)) return null;
    ids.add(value.id);
    previousDate = Date.parse(value.createdAt);
    result.push(rebuilt);
  }
  return result;
}

/** Profile corrections never silently change an existing document version. */
export function isCVVersionStale(version: CVVersion, profile: CareerProfile): boolean {
  if (version.profileId !== profile.id) return true;
  const archive = sourceArchive(profile, version.selection);
  return !archive || getProfileRevision(archive) !== version.profileRevision;
}
