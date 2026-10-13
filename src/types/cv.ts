import type { CareerProfile, EvidenceLink, EvidenceRecordType } from "./profile";

/** Selection edits presentation only; factual wording remains in Career Profile. */
export interface CVSelection {
  evidence: EvidenceLink[];
  skillIds: string[];
}

export interface CVCandidate {
  id: string;
  kind: EvidenceRecordType | "skill";
  label: string;
  text: string;
  href: string;
  matchedRequirementLabels: string[];
  evidenceLink?: EvidenceLink;
  skillId?: string;
}

export interface CVEntry {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
  dates?: string;
  paragraphs: string[];
  bullets: string[];
  evidence: EvidenceLink[];
}

export interface CVContent {
  personal: {
    name: string;
    headline?: string;
    location?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    website?: string;
  };
  sections: { id: string; title: string; entries: CVEntry[] }[];
  skills: { id: string; name: string; evidence: EvidenceLink[] }[];
}

/** A saved version freezes its selected verified sources and rendered facts. */
export interface CVVersion {
  schemaVersion: 1;
  id: string;
  applicationId: string;
  profileId: string;
  jobId: string;
  company: string;
  role: string;
  createdAt: string;
  status: "draft" | "reviewed";
  selection: CVSelection;
  sourceProfile: CareerProfile;
  profileRevision: string;
  content: CVContent;
}
