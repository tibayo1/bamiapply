import type { JobPosting } from "@/types/analysis";
import type { ApplicationRecord, ApplicationStatus } from "@/types/application";
import type { CareerProfile } from "@/types/profile";
import type { CVSelection, CVVersion } from "@/types/cv";
import { createCVVersion } from "@/lib/cv/domain";
import { changeApplicationStatus, createApplicationRecord, refreshApplicationRecord } from "./domain";
import {
  APPLICATIONS_CONFLICT_MESSAGE,
  loadApplicationsStorage,
  saveApplicationsToStorage,
  serializeApplications,
  type ApplicationsStorageLike,
} from "./storage";

export interface SaveApplicationOptions {
  status?: "Saved" | "Preparing" | "Skipped";
  reason?: string;
}

export interface ApplicationCommandResult {
  error: string | null;
}

export interface SaveApplicationResult extends ApplicationCommandResult {
  id: string | null;
}

export interface ApplicationsProviderState {
  applications: ApplicationRecord[];
  isHydrated: boolean;
  canPersist: boolean;
  persistenceIssue: string | null;
}

/** Commands carry source data, never a UI score, analysis override, or claim. */
type ApplicationsCommand =
  | { type: "save"; job: JobPosting; profile: CareerProfile; options: SaveApplicationOptions }
  | { type: "status"; id: string; status: ApplicationStatus; reason?: string }
  | { type: "refresh"; id: string; profile: CareerProfile };

/** Store-owned JSON data stays immutable even when a consumer keeps a reference. */
function freezeState<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeState(child);
    Object.freeze(value);
  }
  return value;
}

function applySaveStatus(record: ApplicationRecord, options: SaveApplicationOptions): ApplicationRecord {
  if (options.status === "Preparing" && (record.status === "Saved" || record.status === "Skipped")) {
    return changeApplicationStatus(record, "Preparing");
  }
  if (options.status === "Skipped" && ["Saved", "Preparing", "Skipped"].includes(record.status)) {
    return changeApplicationStatus(record, "Skipped", options.reason);
  }
  // Opening/building again must not downgrade an application already in flight.
  return record;
}

/**
 * One store per provider, with synchronous commands and a last-successful
 * checkpoint. React subscribes to it; UI code never handles persistence.
 * Failed writes do not apply a command or report an application as saved.
 */
export function createApplicationsStore({
  storage,
  createId = () => `app-${crypto.randomUUID()}`,
  createCVId = () => `cv-${crypto.randomUUID()}`,
}: {
  storage?: ApplicationsStorageLike;
  createId?: () => string;
  createCVId?: () => string;
} = {}) {
  const initialState: ApplicationsProviderState = freezeState({
    applications: [],
    isHydrated: false,
    canPersist: false,
    persistenceIssue: null,
  });
  let state = initialState;
  let checkpoint: string | null = null;
  let retainedRaw: string | null = null;
  let loadedValidData = false;
  const listeners = new Set<() => void>();

  function publish(next: ApplicationsProviderState) {
    state = freezeState(next);
    for (const listener of listeners) listener();
  }

  function commit(applications: ApplicationRecord[]): ApplicationCommandResult {
    const result = saveApplicationsToStorage(applications, storage, checkpoint);
    if (!result.saved) {
      if (result.raw !== undefined && result.raw !== null) retainedRaw = result.raw;
      publish({ ...state, canPersist: false, persistenceIssue: result.issue });
      return { error: result.issue ?? "Your applications could not be saved." };
    }
    checkpoint = result.raw ?? serializeApplications(applications);
    retainedRaw = checkpoint;
    loadedValidData = true;
    publish({ ...state, applications, canPersist: true, persistenceIssue: null });
    return { error: null };
  }

  function execute(command: ApplicationsCommand): SaveApplicationResult {
    if (!state.isHydrated) return { id: null, error: "Your applications are still loading. Please try again shortly." };
    if (!state.canPersist) return { id: null, error: state.persistenceIssue ?? "Saving applications is unavailable in this browser." };

    let record: ApplicationRecord | null;
    let applications: ApplicationRecord[];
    if (command.type === "save") {
      const existing = state.applications.find((item) => item.job.id === command.job.id && item.profileId === command.profile.id);
      record = existing
        ? applySaveStatus(existing, command.options)
        : createApplicationRecord({
            id: createId(),
            job: command.job,
            profile: command.profile,
            status: command.options.status,
            reason: command.options.reason,
          });
      if (!record) return { id: null, error: "This job or Career Profile is invalid. Review the source information before saving." };
      applications = existing
        ? state.applications.map((item) => item.id === existing.id ? record! : item)
        : [...state.applications, record];
    } else {
      const existing = state.applications.find((item) => item.id === command.id);
      if (!existing) return { id: null, error: "This application could not be found." };
      record = command.type === "status"
        ? changeApplicationStatus(existing, command.status, command.reason)
        : refreshApplicationRecord(existing, command.profile);
      if (!record) return { id: null, error: "This analysis could not be refreshed. Use the application's original Career Profile and a valid job." };
      applications = state.applications.map((item) => item.id === command.id ? record! : item);
    }
    const result = commit(applications);
    return { id: result.error ? null : record.id, error: result.error };
  }

  const actions = {
    saveApplication(job: JobPosting, profile: CareerProfile, options: SaveApplicationOptions = {}): SaveApplicationResult {
      return execute({ type: "save", job, profile, options });
    },
    changeStatus(id: string, status: ApplicationStatus, reason?: string): ApplicationCommandResult {
      const result = execute({ type: "status", id, status, reason });
      return { error: result.error };
    },
    refreshAnalysis(id: string, profile: CareerProfile): ApplicationCommandResult {
      const result = execute({ type: "refresh", id, profile });
      return { error: result.error };
    },
    saveCVVersion(id: string, profile: CareerProfile, selection: CVSelection, status: CVVersion["status"]): SaveApplicationResult {
      if (!state.isHydrated) return { id: null, error: "Your applications are still loading. Please try again shortly." };
      if (!state.canPersist) return { id: null, error: state.persistenceIssue ?? "Saving applications is unavailable in this browser." };
      const application = state.applications.find((item) => item.id === id);
      if (!application) return { id: null, error: "This application could not be found." };
      const version = createCVVersion({ id: createCVId(), application, profile, selection, status });
      if (!version || Date.parse(version.createdAt) < Date.parse(application.updatedAt)
        || application.cvVersions?.some((item) => item.id === version.id)) {
        return { id: null, error: "This CV could not be saved. Use the application's Career Profile and select only currently verified evidence." };
      }
      const updated: ApplicationRecord = {
        ...application,
        cvVersions: [...(application.cvVersions ?? []), version],
        cvStatus: version.status === "reviewed" ? "Complete" : "In progress",
        updatedAt: version.createdAt,
      };
      // Document history and progress share one checked write. A quota error
      // must never leave a Complete badge for a document that was not saved.
      const result = commit(state.applications.map((item) => item.id === id ? updated : item));
      return { id: result.error ? null : version.id, error: result.error };
    },
    getApplicationForJob(jobId: string, profileId: string): ApplicationRecord | undefined {
      return state.applications.find((item) => item.job.id === jobId && item.profileId === profileId);
    },
    retryPersistence() {
      if (!state.isHydrated) return;
      const loaded = loadApplicationsStorage(storage);
      if (loaded.raw !== null) retainedRaw = loaded.raw;
      if (!loaded.canPersist) {
        publish({ ...state, canPersist: false, persistenceIssue: loaded.issue });
        return;
      }
      if (!loadedValidData && loaded.raw !== null) {
        publish({
          ...state,
          canPersist: false,
          persistenceIssue: "Readable saved applications are now available. Export this tab's applications, then reload to restore the saved version. No saved data has been replaced.",
        });
        return;
      }
      // A retry never adopts newly observed bytes as our writable checkpoint.
      commit(state.applications);
    },
    getApplicationsRecoveryData(): string {
      return retainedRaw ?? serializeApplications(state.applications);
    },
    getApplicationsExportData(): string {
      return serializeApplications(state.applications);
    },
  };

  return {
    actions,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => state,
    getServerSnapshot: () => initialState,
    hydrate() {
      if (state.isHydrated) return;
      const loaded = loadApplicationsStorage(storage);
      checkpoint = loaded.raw;
      retainedRaw = loaded.raw;
      loadedValidData = loaded.canPersist;
      publish({
        applications: loaded.applications,
        isHydrated: true,
        canPersist: loaded.canPersist,
        persistenceIssue: loaded.issue,
      });
    },
    observeExternalChanges() {
      if (!state.isHydrated) return;
      const loaded = loadApplicationsStorage(storage);
      if (loaded.raw !== null) retainedRaw = loaded.raw;
      if (!loaded.canPersist || loaded.raw !== checkpoint) {
        publish({
          ...state,
          canPersist: false,
          persistenceIssue: loaded.issue ?? APPLICATIONS_CONFLICT_MESSAGE,
        });
      }
    },
  };
}
