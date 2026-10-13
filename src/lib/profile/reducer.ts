import type {
  CareerProfile,
  EvidenceLink,
  EvidenceRecordType,
  PersonalProfile,
  ProfileClaim,
  ProfileCollection,
  ProfileRecord,
  VerificationStatus,
} from "@/types/profile";
import { createDemoProfile } from "./mock-profile";
import { prepareImportAdditions, type ImportAdditions } from "./import";
import { normalizeCareerProfile, normalizeProfileRecord } from "./validation";

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
      additions: ImportAdditions;
    }
  | { type: "RESET_PROFILE" }
  | { type: "REPLACE_PROFILE"; profile: CareerProfile };

/** Ordinary saves cannot turn an existing statement into confirmed evidence. */
function reconcileClaims(claims: ProfileClaim[], previous: ProfileClaim[], recordId: string): ProfileClaim[] {
  const byId = new Map(previous.map((claim) => [claim.id, claim]));
  return claims.map((claim) => {
    const old = byId.get(claim.id);
    if (!old) {
      return claim.source === "user" && !claim.sourceRecordId
        ? { ...claim, sourceRecordId: recordId }
        : claim;
    }
    const changed = old.text.trim() !== claim.text.trim();
    return {
      ...claim,
      source: old.source,
      sourceRecordId: old.sourceRecordId,
      derivedFromClaimId: old.derivedFromClaimId,
      verificationStatus: changed && old.verificationStatus === "verified"
        ? "needs_confirmation"
        : old.verificationStatus,
    };
  });
}

function reconcileRecord(record: ProfileRecord, previous?: ProfileRecord): ProfileRecord {
  if ("responsibilities" in record) {
    const old = previous && "responsibilities" in previous ? previous : undefined;
    const contextChanged = old && (
      old.title !== record.title || old.organization !== record.organization ||
      old.startDate !== record.startDate || old.endDate !== record.endDate
    );
    return {
      ...record,
      source: old?.source ?? record.source,
      createdAt: old?.createdAt ?? record.createdAt,
      verificationStatus: contextChanged && old.verificationStatus === "verified"
        ? "needs_confirmation" : record.verificationStatus,
      responsibilities: reconcileClaims(record.responsibilities, old?.responsibilities ?? [], record.id),
    };
  }
  if ("outcomes" in record) {
    const old = previous && "outcomes" in previous ? previous : undefined;
    const contextChanged = old && (
      old.title !== record.title || old.organization !== record.organization ||
      old.objective !== record.objective || old.role !== record.role
    );
    return {
      ...record,
      source: old?.source ?? record.source,
      createdAt: old?.createdAt ?? record.createdAt,
      verificationStatus: contextChanged && old.verificationStatus === "verified"
        ? "needs_confirmation" : record.verificationStatus,
      outcomes: reconcileClaims(record.outcomes, old?.outcomes ?? [], record.id),
    };
  }
  return previous ? { ...record, source: previous.source, createdAt: previous.createdAt } : record;
}

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

  const achievements = profile.achievements.map((achievement) =>
    achievement.linkedRecordType === recordType && achievement.linkedRecordId === recordId
      ? { ...achievement, linkedRecordType: undefined, linkedRecordId: undefined }
      : achievement
  );

  return {
    ...profile,
    skills,
    careerStories,
    experiences,
    researchProjects,
    achievements,
  };
}

export function profileReducer(
  state: CareerProfile,
  action: ProfileAction,
  now: string = new Date().toISOString()
): CareerProfile {
  switch (action.type) {
    case "UPDATE_PERSONAL": {
      return normalizeCareerProfile({
        ...state,
        personal: {
          ...state.personal,
          ...action.personal,
          updatedAt: now,
        },
        updatedAt: now,
      }) ?? state;
    }

    case "UPSERT_RECORD": {
      const { collection } = action;
      const normalized = normalizeProfileRecord(collection, action.record, now);
      if (!normalized) return state;
      const previous = state[collection].find((item) => item.id === normalized.id);
      const record = reconcileRecord(normalized, previous);
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
      return normalizeCareerProfile({
        ...state,
        [collection]: nextList,
        updatedAt: now,
      }) ?? state;
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
        // Confirming record-level facts does not confirm its individual claims.
        return { ...record, verificationStatus: status, updatedAt: now };
      });

      return normalizeCareerProfile({
        ...state,
        [collection]: nextList,
        updatedAt: now,
      }) ?? state;
    }

    case "UPDATE_PREFERENCES": {
      return normalizeCareerProfile({
        ...state,
        preferences: {
          ...state.preferences,
          ...action.preferences,
          updatedAt: now,
        },
        updatedAt: now,
      }) ?? state;
    }

    case "APPLY_IMPORT": {
      const additions = prepareImportAdditions(state, action.additions);
      if (Object.values(additions).every((records) => !records?.length)) return state;
      return normalizeCareerProfile({
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
      }) ?? state;
    }

    case "RESET_PROFILE": {
      return createDemoProfile();
    }

    case "REPLACE_PROFILE": {
      return normalizeCareerProfile(action.profile) ?? state;
    }

    default:
      return state;
  }
}
