"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createJobsStore, type JobsProviderState } from "./provider-state";
import { JOBS_STORAGE_KEY } from "./storage";

export type JobsContextValue = JobsProviderState & ReturnType<typeof createJobsStore>["actions"];
const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createJobsStore());
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    store.hydrate();
    const onStorageChange = (event: StorageEvent) => {
      if (event.key !== null && event.key !== JOBS_STORAGE_KEY) return;
      try { if (event.storageArea !== null && event.storageArea !== window.localStorage) return; }
      catch { /* Storage errors are reported by the store. */ }
      store.observeExternalChanges();
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [store]);

  return <JobsContext value={{ ...state, ...store.actions }}>{children}</JobsContext>;
}

export function useJobs(): JobsContextValue {
  const context = use(JobsContext);
  if (!context) throw new Error("useJobs must be used within a JobsProvider");
  return context;
}
