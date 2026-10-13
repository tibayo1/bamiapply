"use client";

import { Button } from "@/components/ui/Button";
import { useJobs } from "@/lib/jobs/context";

function downloadData(data: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function JobsPersistenceNotice() {
  const { persistenceIssue, getJobsRecoveryData, getJobsExportData, retryPersistence } = useJobs();
  if (!persistenceIssue) return null;
  return (
    <div role="status" className="mb-6 rounded-lg border border-warning-line bg-warning-subtle p-4 text-meta text-ink">
      <p className="font-semibold">Job saving is paused</p>
      <p className="mt-1">{persistenceIssue}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => downloadData(getJobsRecoveryData(), "bami-jobs-backup.json")}>Download saved jobs backup</Button>
        <Button variant="secondary" size="sm" onClick={() => downloadData(getJobsExportData(), "bami-jobs-current.json")}>Export this tab&apos;s jobs</Button>
        <Button variant="secondary" size="sm" onClick={retryPersistence}>Retry job saving</Button>
      </div>
    </div>
  );
}
