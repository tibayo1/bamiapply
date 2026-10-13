"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadCVText, getCVExportIssue, printCVVersion } from "@/lib/cv/export";
import type { CVVersion } from "@/types/cv";
import type { CareerProfile } from "@/types/profile";

interface CVVersionExportProps {
  version: CVVersion;
  profile: CareerProfile;
  disabled?: boolean;
  disabledReason?: string;
}

export function CVVersionExport({ version, profile, disabled = false, disabledReason }: CVVersionExportProps) {
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const issue = disabled ? disabledReason ?? "Save and review your changes before exporting." : getCVExportIssue(version, profile);

  function handleDownload() {
    if (issue) return;
    setError(null);
    try {
      downloadCVText(version, profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The CV could not download. Please try again.");
    }
  }

  async function handlePrint() {
    if (issue) return;
    setError(null);
    setPrinting(true);
    try {
      await printCVVersion(version, profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The print dialog could not open. Please try again.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={Boolean(issue) || printing} onClick={handleDownload}><Download size={16} aria-hidden="true" />Download text</Button>
        <Button variant="secondary" disabled={Boolean(issue) || printing} onClick={handlePrint}><Printer size={16} aria-hidden="true" />{printing ? "Opening print…" : "Print / Save as PDF"}</Button>
      </div>
      <p className="text-micro text-ink-muted">{issue ?? "Choose Save as PDF in your browser’s print dialog. Turn off browser headers and footers for a clean CV."}</p>
      {error ? <p role="alert" className="text-meta text-danger">{error}</p> : null}
    </div>
  );
}
