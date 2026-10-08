import type {
  CareerProfile,
  EvidenceLink,
  EvidenceRecordType,
  ExperienceRecord,
  PersonalProfile,
  ProfileClaim,
  ProfileCollection,
  ResearchProjectRecord,
  VerificationStatus,
} from "@/types/profile";
import { createDemoProfile } from "./mock-profile";

export type ProfileAction =
  | { type: "UPDATE_PERSONAL"; personal: Partial<PersonalProfile> }
  | {
      type: "UPSERT_RECORD";
      collection: ProfileCollection;
      record: CareerProfile[ProfileCollection][number];
    }
  | {
      type: "REMOVE_RECORD";
      collection: ProfileCollection;
      id: string;
    }
  | {
      type: "SET_VERIFICATION_STATUS";
      collection: ProfileCollection;
      id: string;
      status: VerificationStatus;
      claimId?: string;
    }
  | {
      type: "UPDATE_PREFERENCES";
      preferences: Partial<CareerProfile["preferences"]>;
    }
  | {
      type: "APPLY_IMPORT";
      additions: {
        experiences?: CareerProfile["experiences"];
        education?: CareerProfile["education"];
        researchProjects?: CareerProfile["researchProjects"];
        skills?: CareerProfile["skills"];
        achievements?: CareerProfile["achievements"];
      };
    }
  | { type: "RESET_PROFILE" }
  | { type: "REPLACE_PROFILE"; profile: CareerProfile };

function removeDanglingLinks(
  profile: CareerProfile,
  recordType: EvidenceRecordType | "skill",
  recordId: string
): CareerProfile {
  const cleanLinks = (links: EvidenceLink[]) =>
    links.filter((l) => !(l.recordType === recordType && l.recordId === recordId));

  const skills = profile.skills.map((s) => ({
    ...s,
    evidenceLinks: cleanLinks(s.evidenceLinks),
  }));

  const careerStories = profile.careerStories.map((story) => ({
    ...story,
    evidenceLinks: cleanLinks(story.evidenceLinks),
    skillIds: recordType === "skill" ? story.skillIds.filter((id) => id !== recordId) : story.skillIds,
  }));

  const experiences = profile.experiences.map((exp) => ({
    ...exp,
    skillIds: recordType === "skill" ? exp.skillIds.filter((id) => id !== recordId) : exp.skillIds,
    achievementIds:
      recordType === "achievement" ? exp.achievementIds.filter((id) => id !== recordId) : exp.achievementIds,
  }));

  const researchProjects = profile.researchProjects.map((p) => ({
    ...p,
    skillIds: recordType === "skill" ? p.skillIds.filter((id) => id !== recordId) : p.skillIds,
  }));

  return {
    ...profile,
    skills,
    careerStories,
    experiences,
    researchProjects,
  };
}

export function profileReducer(
  state: CareerProfile,
  action: ProfileAction,
  now: string = new Date().toISOString()
): CareerProfile {
  switch (action.type) {
    case "UPDATE_PERSONAL": {
      return {
        ...state,
        personal: {
          ...state.personal,
          ...action.personal,
          updatedAt: now,
        },
        updatedAt: now,
      };
    }

    case "UPSERT_RECORD": {
      const { collection, record } = action;
      const list = state[collection] as unknown as Array<{
        id: string;
        createdAt?: string;
        updatedAt?: string;
      }>;
      const idx = list.findIndex((item) => item.id === record.id);
      let nextList;
      if (idx >= 0) {
        nextList = [...list];
        nextList[idx] = { ...record, updatedAt: now };
      } else {
        nextList = [
          ...list,
          {
            ...record,
            createdAt: (record as { createdAt?: string }).createdAt || now,
            updatedAt: now,
          },
        ];
      }
      return {
        ...state,
        [collection]: nextList,
        updatedAt: now,
      };
    }

    case "REMOVE_RECORD": {
      const { collection, id } = action;
      const list = state[collection] as Array<{ id: string }>;
      const nextList = list.filter((r) => r.id !== id);
      const cleaned = {
        ...state,
        [collection]: nextList,
        updatedAt: now,
      };

      const recordTypeMap: Record<string, EvidenceRecordType | "skill"> = {
        experiences: "experience",
        education: "education",
        researchProjects: "research_project",
        achievements: "achievement",
        careerStories: "career_story",
        skills: "skill",
      };

      const recordType = recordTypeMap[collection];
      if (recordType) {
        return removeDanglingLinks(cleaned, recordType, id);
      }
      return cleaned;
    }

    case "SET_VERIFICATION_STATUS": {
      const { collection, id, status, claimId } = action;

      if (claimId && collection === "experiences") {
        const nextList = state.experiences.map((exp) => {
          if (exp.id !== id) return exp;
          const nextClaims = exp.responsibilities.map((c) =>
            c.id === claimId ? { ...c, verificationStatus: status } : c
          );
          return { ...exp, responsibilities: nextClaims, updatedAt: now };
        });
        return { ...state, experiences: nextList, updatedAt: now };
      }

      if (claimId && collection === "researchProjects") {
        const nextList = state.researchProjects.map((proj) => {
          if (proj.id !== id) return proj;
          const nextClaims = proj.outcomes.map((c) =>
            c.id === claimId ? { ...c, verificationStatus: status } : c
          );
          return { ...proj, outcomes: nextClaims, updatedAt: now };
        });
        return { ...state, researchProjects: nextList, updatedAt: now };
      }

      const list = state[collection] as Array<{ id: string; verificationStatus: VerificationStatus }>;
      const nextList = list.map((record) => {
        if (record.id !== id) return record;
        // When marking a whole record as verified, also elevate its claims if desired
        if (status === "verified") {
          if ("responsibilities" in record) {
            const exp = record as ExperienceRecord;
            return {
              ...exp,
              verificationStatus: status,
              responsibilities: exp.responsibilities.map((c: ProfileClaim) =>
                c.verificationStatus === "needs_confirmation"
                  ? { ...c, verificationStatus: "verified" as const }
                  : c
              ),
              updatedAt: now,
            };
          }
          if ("outcomes" in record) {
            const proj = record as ResearchProjectRecord;
            return {
              ...proj,
              verificationStatus: status,
              outcomes: proj.outcomes.map((c: ProfileClaim) =>
                c.verificationStatus === "needs_confirmation"
                  ? { ...c, verificationStatus: "verified" as const }
                  : c
              ),
              updatedAt: now,
            };
          }
        }
        return { ...record, verificationStatus: status, updatedAt: now };
      });

      return {
        ...state,
        [collection]: nextList,
        updatedAt: now,
      };
    }

    case "UPDATE_PREFERENCES": {
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.preferences,
          updatedAt: now,
        },
        updatedAt: now,
      };
    }

    case "APPLY_IMPORT": {
      const { additions } = action;
      return {
        ...state,
        experiences: additions.experiences
          ? [...state.experiences, ...additions.experiences]
          : state.experiences,
        education: additions.education
          ? [...state.education, ...additions.education]
          : state.education,
        researchProjects: additions.researchProjects
          ? [...state.researchProjects, ...additions.researchProjects]
          : state.researchProjects,
        skills: additions.skills
          ? [...state.skills, ...additions.skills]
          : state.skills,
        achievements: additions.achievements
          ? [...state.achievements, ...additions.achievements]
          : state.achievements,
        updatedAt: now,
      };
    }

    case "RESET_PROFILE": {
      return createDemoProfile();
    }

    case "REPLACE_PROFILE": {
      return action.profile;
    }

    default:
      return state;
  }
}
