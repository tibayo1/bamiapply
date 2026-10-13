"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createApplicationsStore, type ApplicationsProviderState } from "./provider-state";
import { APPLICATIONS_STORAGE_KEY } from "./storage";

export type ApplicationsContextValue = ApplicationsProviderState & ReturnType<typeof createApplicationsStore>["actions"];

const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  // An isolated instance per mounted provider. No storage access during SSR.
  const [store] = useState(() => createApplicationsStore());
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    store.hydrate();
    const onStorageChange = (event: StorageEvent) => {
      if (event.key !== null && event.key !== APPLICATIONS_STORAGE_KEY) return;
      // Ignore sessionStorage events; accessing localStorage can itself throw.
      try {
        if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
      } catch {
        // The store reports unavailable storage without throwing into the UI.
      }
      store.observeExternalChanges();
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [store]);

  return (
    <ApplicationsContext value={{ ...state, ...store.actions }}>
      {children}
    </ApplicationsContext>
  );
}

export function useApplications(): ApplicationsContextValue {
  const context = use(ApplicationsContext);
  if (!context) throw new Error("useApplications must be used within an ApplicationsProvider");
  return context;
}
