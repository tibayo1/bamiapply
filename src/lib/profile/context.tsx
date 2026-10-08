"use client";

import React, { createContext, useContext, useEffect, useReducer, useState } from "react";
import type {
  CareerProfile,
  PersonalProfile,
  ProfileCollection,
  VerificationStatus,
} from "@/types/profile";
import { createDemoProfile } from "./mock-profile";
import { profileReducer, type ProfileAction } from "./reducer";
import { loadProfileFromStorage, saveProfileToStorage } from "./storage";

interface ProfileContextValue {
  profile: CareerProfile;
  dispatch: React.Dispatch<ProfileAction>;
  isHydrated: boolean;
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
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    const loaded = loadProfileFromStorage();
    dispatch({ type: "REPLACE_PROFILE", profile: loaded });
    queueMicrotask(() => {
      setIsHydrated(true);
    });
  }, []);

  // Save changes to localStorage after hydration
  useEffect(() => {
    if (isHydrated) {
      saveProfileToStorage(profile);
    }
  }, [profile, isHydrated]);

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
    dispatch({ type: "RESET_PROFILE" });
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        dispatch,
        isHydrated,
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
