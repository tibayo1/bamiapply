"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JobRequirement } from "@/types/analysis";

interface AddEvidenceModalProps {
  requirement: JobRequirement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reqId: string, note: string) => void;
}

export function AddEvidenceModal({
  requirement,
  open,
  onOpenChange,
  onConfirm,
}: AddEvidenceModalProps) {
  const [note, setNote] = useState("");

  if (!requirement) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requirement) return;
    onConfirm(requirement.id, note.trim());
    setNote("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface p-6 shadow-preview focus:outline-none">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-micro font-semibold uppercase tracking-wider text-brand">
                / ADD PROFILE EVIDENCE
              </span>
              <Dialog.Title className="mt-1 text-heading font-semibold text-ink">
                Confirm experience for {requirement.label}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="focus-ring transition-ui rounded-md p-1.5 text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-2 text-meta text-ink-secondary leading-relaxed">
            Bámi did not find evidence for this in your Career Profile. If you have relevant work, project, or certification experience, you can confirm it below. This will temporarily recalculate your fit analysis for this opportunity.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="evidence-note"
                className="block text-meta font-medium text-ink"
              >
                Describe your experience or context (optional):
              </label>
              <textarea
                id="evidence-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g., Completed ISO 14155 auditing workshop and applied guidelines during university device trials…"
                className="mt-1.5 w-full rounded-lg border border-line-strong bg-canvas px-3.5 py-2.5 text-body text-ink placeholder:text-ink-muted focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Confirm experience
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
