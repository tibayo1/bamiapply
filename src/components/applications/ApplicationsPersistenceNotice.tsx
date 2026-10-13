"use client";

import { Button } from "@/components/ui/Button";
import { useApplications } from "@/lib/applications/context";

function downloadData(data: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Composed once in the app layout so failures remain visible on every route. */
export function ApplicationsPersistenceNotice() {
  const { persistenceIssue, getApplicationsRecoveryData, getApplicationsExportData, retryPersistence } = useApplications();
  if (!persistenceIssue) return null;

  return (
    <div role="status" className="mb-6 rounded-lg border border-warning-line bg-warning-subtle p-4 text-meta text-ink">
      <p className="font-semibold">Application saving is paused</p>
      <p className="mt-1">{persistenceIssue}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => downloadData(getApplicationsRecoveryData(), "bami-applications-backup.json")}>
          Download saved backup
        </Button>
        <Button variant="secondary" size="sm" onClick={() => downloadData(getApplicationsExportData(), "bami-applications-current.json")}>
          Export this tab&apos;s applications
        </Button>
        <Button variant="secondary" size="sm" onClick={retryPersistence}>
          Retry saving
        </Button>
      </div>
    </div>
  );
}
