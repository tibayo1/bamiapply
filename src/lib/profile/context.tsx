"use client";

import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import type {
  CareerProfile,
  PersonalProfile,
  ProfileCollection,
  VerificationStatus,
} from "@/types/profile";
import { createDemoProfile } from "./mock-profile";
import { profileReducer, type ProfileAction } from "./reducer";
import { loadProfileStorage, saveProfileToStorage, serializeProfile } from "./storage";

interface ProfileContextValue {
  profile: CareerProfile;
  dispatch: React.Dispatch<ProfileAction>;
  isHydrated: boolean;
  canPersist: boolean;
  persistenceIssue: string | null;
  retryPersistence: () => void;
  getProfileRecoveryData: () => string;
  getProfileExportData: () => string;
  updatePersonal: (personal: Partial<PersonalProfile>) => void;
  upsertRecord: (collection: ProfileCollection, record: CareerProfile[ProfileCollection][number]) => void;
  removeRecord: (collection: ProfileCollection, id: string) => void;
  setVerificationStatus: (
    collection: ProfileCollection,
    id: string,
    status: VerificationStatus,
    claimId?: string
  ) => void;
  updatePreferences: (prefs: Partial<CareerProfile["preferences"]>) => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  // Start with default demo profile so SSR and first render match cleanly
  const [profile, dispatch] = useReducer(
    (state: CareerProfile, action: ProfileAction): CareerProfile =>
      profileReducer(state, action),
    createDemoProfile()
  );
  const [persistence, setPersistence] = useState({
    isHydrated: false,
    canPersist: false,
    issue: null as string | null,
  });
  const retainedRaw = useRef<string | null>(null);
  // This checkpoint advances only after a successful load/write. Backup bytes
  // may capture another tab's version without granting permission to replace it.
  const persistenceCheckpoint = useRef<string | null>(null);
  const loadedValidProfile = useRef(false);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    const loaded = loadProfileStorage();
    retainedRaw.current = loaded.raw;
    persistenceCheckpoint.current = loaded.raw;
    loadedValidProfile.current = loaded.canPersist;
    dispatch({ type: "REPLACE_PROFILE", profile: loaded.profile });
    queueMicrotask(() => {
      setPersistence({ isHydrated: true, canPersist: loaded.canPersist, issue: loaded.issue });
    });
  }, []);

  // Save changes to localStorage after hydration
  useEffect(() => {
    if (persistence.isHydrated && persistence.canPersist) {
      const result = saveProfileToStorage(profile, undefined, persistenceCheckpoint.current);
      if (!result.saved) {
        if (result.raw !== undefined && result.raw !== null) retainedRaw.current = result.raw;
        queueMicrotask(() => setPersistence((current) => ({ ...current, canPersist: false, issue: result.issue })));
      } else {
        const savedRaw = result.raw ?? serializeProfile(profile);
        persistenceCheckpoint.current = savedRaw;
        retainedRaw.current = savedRaw;
      }
    }
  }, [profile, persistence.isHydrated, persistence.canPersist]);

  const retryPersistence = () => {
    const loaded = loadProfileStorage();
    if (!loaded.canPersist) {
      if (loaded.raw !== null) {
        retainedRaw.current = loaded.raw;
      }
      setPersistence({ isHydrated: true, canPersist: false, issue: loaded.issue });
      return;
    }
    if (!loadedValidProfile.current && loaded.raw !== null) {
      // A recovered saved profile must not overwrite active edits, and active
      // recovery edits must not overwrite the now-readable saved profile.
      setPersistence({
        isHydrated: true,
        canPersist: false,
        issue: "A readable saved profile is now available. Download any unsaved changes, then reload this page to restore it. Your current profile has not been replaced.",
      });
      return;
    }
    // Re-reading verifies availability and format; it does not adopt external
    // bytes as our checkpoint or permit a stale tab to overwrite newer edits.
    const result = saveProfileToStorage(profile, undefined, persistenceCheckpoint.current);
    if (result.saved) {
      loadedValidProfile.current = true;
      const savedRaw = result.raw ?? serializeProfile(profile);
      persistenceCheckpoint.current = savedRaw;
      retainedRaw.current = savedRaw;
    } else if (result.raw !== undefined && result.raw !== null) {
      retainedRaw.current = result.raw;
    }
    setPersistence({ isHydrated: true, canPersist: result.saved, issue: result.issue });
  };

  const getProfileRecoveryData = () => {
    // Recovery downloads preserve original saved bytes. Current in-memory
    // changes have a separate export so a failed write never loses either copy.
    return retainedRaw.current ?? serializeProfile(profile);
  };

  const getProfileExportData = () => serializeProfile(profile);

  const updatePersonal = (personal: Partial<PersonalProfile>) => {
    dispatch({ type: "UPDATE_PERSONAL", personal });
  };

  const upsertRecord = (
    collection: ProfileCollection,
    record: CareerProfile[ProfileCollection][number]
  ) => {
    dispatch({ type: "UPSERT_RECORD", collection, record });
  };

  const removeRecord = (collection: ProfileCollection, id: string) => {
    dispatch({ type: "REMOVE_RECORD", collection, id });
  };

  const setVerificationStatus = (
    collection: ProfileCollection,
    id: string,
    status: VerificationStatus,
    claimId?: string
  ) => {
    dispatch({ type: "SET_VERIFICATION_STATUS", collection, id, status, claimId });
  };

  const updatePreferences = (preferences: Partial<CareerProfile["preferences"]>) => {
    dispatch({ type: "UPDATE_PREFERENCES", preferences });
  };

  const resetProfile = () => {
    if (!persistence.canPersist) return;
    dispatch({ type: "RESET_PROFILE" });
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        dispatch,
        isHydrated: persistence.isHydrated,
        canPersist: persistence.canPersist,
        persistenceIssue: persistence.issue,
        retryPersistence,
        getProfileRecoveryData,
        getProfileExportData,
        updatePersonal,
        upsertRecord,
        removeRecord,
        setVerificationStatus,
        updatePreferences,
        resetProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
