import type { CareerProfile } from "@/types/profile";
import type { JobDraftInput, ReviewedJobRecord } from "@/types/job";
import { reviewJobInput } from "./ingestion";
import { JOBS_CONFLICT_MESSAGE, loadJobsStorage, saveJobsToStorage, serializeJobs, type JobsStorageLike } from "./storage";

export interface JobsProviderState {
  jobs: ReviewedJobRecord[];
  isHydrated: boolean;
  canPersist: boolean;
  persistenceIssue: string | null;
}

export interface ImportJobResult {
  id: string | null;
  error: string | null;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Jobs own reviewed employer input; Profile and Application state remain independent. */
export function createJobsStore({ storage, createId = () => `job-${crypto.randomUUID()}` }: {
  storage?: JobsStorageLike;
  createId?: () => string;
} = {}) {
  const initialState: JobsProviderState = freeze({ jobs: [], isHydrated: false, canPersist: false, persistenceIssue: null });
  let state = initialState;
  let checkpoint: string | null = null;
  let retainedRaw: string | null = null;
  let loadedValidData = false;
  const listeners = new Set<() => void>();

  function publish(next: JobsProviderState) {
    state = freeze(next);
    for (const listener of listeners) listener();
  }

  function commit(jobs: ReviewedJobRecord[]): string | null {
    const result = saveJobsToStorage(jobs, storage, checkpoint);
    if (!result.saved) {
      if (result.raw !== undefined && result.raw !== null) retainedRaw = result.raw;
      publish({ ...state, canPersist: false, persistenceIssue: result.issue });
      return result.issue ?? "Your jobs could not be saved.";
    }
    checkpoint = result.raw ?? serializeJobs(jobs);
    retainedRaw = checkpoint;
    loadedValidData = true;
    publish({ ...state, jobs, canPersist: true, persistenceIssue: null });
    return null;
  }

  const actions = {
    importJob(input: JobDraftInput, profile: CareerProfile): ImportJobResult {
      if (!state.isHydrated) return { id: null, error: "Your saved jobs are still loading. Please try again shortly." };
      if (!state.canPersist) return { id: null, error: state.persistenceIssue ?? "Saving jobs is unavailable in this browser." };
      const reviewed = reviewJobInput(input, profile);
      if (!reviewed.job || reviewed.error) return { id: null, error: reviewed.error ?? "Review the job requirements before saving." };
      let id: string;
      try { id = createId(); }
      catch { return { id: null, error: "A job ID could not be created. Please try again." }; }
      if (!/^job-[^\s/]+$/.test(id) || state.jobs.some((job) => job.id === id)) {
        return { id: null, error: "A unique job ID could not be created. Please try again." };
      }
      // Clone before freezing: the consumer's Profile and reviewed form stay editable.
      const record: ReviewedJobRecord = JSON.parse(JSON.stringify({
        id, profileId: profile.id, posting: { ...reviewed.job, id }, createdAt: new Date().toISOString(),
      }));
      const error = commit([...state.jobs, record]);
      return { id: error ? null : id, error };
    },
    getJob(id: string, profileId: string): ReviewedJobRecord | undefined {
      return state.jobs.find((job) => job.id === id && job.profileId === profileId);
    },
    retryPersistence() {
      if (!state.isHydrated) return;
      const loaded = loadJobsStorage(storage);
      if (loaded.raw !== null) retainedRaw = loaded.raw;
      if (!loaded.canPersist) {
        publish({ ...state, canPersist: false, persistenceIssue: loaded.issue });
        return;
      }
      if (!loadedValidData && loaded.raw !== null) {
        publish({ ...state, canPersist: false, persistenceIssue: "Readable saved jobs are now available. Export this tab's jobs, then reload to restore the saved version. No saved data has been replaced." });
        return;
      }
      commit(state.jobs);
    },
    getJobsRecoveryData(): string { return retainedRaw ?? serializeJobs(state.jobs); },
    getJobsExportData(): string { return serializeJobs(state.jobs); },
  };

  return {
    actions,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state,
    getServerSnapshot: () => initialState,
    hydrate() {
      if (state.isHydrated) return;
      const loaded = loadJobsStorage(storage);
      checkpoint = loaded.raw;
      retainedRaw = loaded.raw;
      loadedValidData = loaded.canPersist;
      publish({ jobs: loaded.jobs, isHydrated: true, canPersist: loaded.canPersist, persistenceIssue: loaded.issue });
    },
    observeExternalChanges() {
      if (!state.isHydrated) return;
      const loaded = loadJobsStorage(storage);
      if (loaded.raw !== null) retainedRaw = loaded.raw;
      if (!loaded.canPersist || loaded.raw !== checkpoint) {
        publish({ ...state, canPersist: false, persistenceIssue: loaded.issue ?? JOBS_CONFLICT_MESSAGE });
      }
    },
  };
}
