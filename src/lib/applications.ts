import type {
  Application,
  ApplicationFilter,
  ApplicationSort,
  ApplicationStatus,
  ApplicationStatusCounts,
} from "@/types/application";

/**
 * Pure helpers over Application[]. Written so the same functions can
 * run against rows returned from a database later.
 */

/** Which statuses each dashboard tab includes. "Saved" appears under All only. */
export const filterStatuses: Record<Exclude<ApplicationFilter, "all">, ApplicationStatus[]> = {
  preparing: ["Preparing", "Ready to Apply"],
  applied: ["Applied"],
  interviews: ["Assessment", "Interview"],
  offers: ["Offer"],
};

export function getStatusCounts(applications: Application[]): ApplicationStatusCounts {
  const count = (statuses: ApplicationStatus[]) =>
    applications.filter((a) => statuses.includes(a.status)).length;

  return {
    all: applications.length,
    preparing: count(filterStatuses.preparing),
    applied: count(filterStatuses.applied),
    interviews: count(filterStatuses.interviews),
    offers: count(filterStatuses.offers),
  };
}

export const sortLabels: Record<ApplicationSort, string> = {
  updated: "Recently updated",
  fit: "Fit score",
  company: "Company A–Z",
};

export function filterApplications(
  applications: Application[],
  filter: ApplicationFilter,
  query: string
): Application[] {
  const q = query.trim().toLowerCase();

  return applications.filter((a) => {
    if (filter !== "all" && !filterStatuses[filter].includes(a.status)) return false;
    if (!q) return true;
    return [a.company, a.role, a.location].some((v) => v.toLowerCase().includes(q));
  });
}

export function sortApplications(applications: Application[], sort: ApplicationSort): Application[] {
  const list = [...applications];
  switch (sort) {
    case "fit":
      return list.sort((a, b) => b.fitScore - a.fitScore);
    case "company":
      return list.sort((a, b) => a.company.localeCompare(b.company));
    case "updated":
    default:
      return list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }
}
