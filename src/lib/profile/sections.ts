import type { EvidenceRecordType } from "@/types/profile";

export const PROFILE_SECTIONS = [
  { id: "overview", label: "Overview", description: "Who you are and how complete your evidence is." },
  { id: "experience", label: "Experience", description: "Roles, responsibilities and what you did." },
  { id: "education", label: "Education", description: "Degrees, thesis work and training." },
  { id: "research", label: "Research & Projects", description: "Studies, theses and technical projects." },
  { id: "skills", label: "Skills", description: "Each skill tied to the work that demonstrates it." },
  { id: "achievements", label: "Achievements", description: "Reusable outcomes. Metrics are optional." },
  { id: "stories", label: "Career Stories", description: "Examples you can reuse for questions and interviews." },
  { id: "preferences", label: "Career Preferences", description: "Eligibility facts and what you are looking for." },
] as const;

export const SECTIONS = PROFILE_SECTIONS;

export type SectionId = (typeof PROFILE_SECTIONS)[number]["id"];

export function isSectionId(value: string | null | undefined): value is SectionId {
  return PROFILE_SECTIONS.some((s) => s.id === value);
}

export const SECTION_BY_RECORD_TYPE: Record<EvidenceRecordType, SectionId> = {
  experience: "experience",
  education: "education",
  research_project: "research",
  achievement: "achievements",
  career_story: "stories",
};

/** Deep link to a section, optionally to one record inside it. */
export function profileHref(section: SectionId, recordId?: string): string {
  const params = new URLSearchParams({ section });
  if (recordId) params.set("record", recordId);
  return `/profile?${params.toString()}`;
}
