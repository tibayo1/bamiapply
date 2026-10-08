"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SkipRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSkip: (reason: string) => void;
}

const SKIP_REASONS = [
  "Non-negotiable eligibility blocker",
  "Insufficient core match / poor fit",
  "Not interested in company or domain",
  "Location / commute constraint",
  "Compensation expectations",
  "Other",
];

export function SkipRoleModal({
  open,
  onOpenChange,
  onConfirmSkip,
}: SkipRoleModalProps) {
  const [selectedReason, setSelectedReason] = useState(SKIP_REASONS[0]);

  function handleConfirm() {
    onConfirmSkip(selectedReason);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface p-6 shadow-preview focus:outline-none">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                / APPLICATION DECISION
              </span>
              <Dialog.Title className="mt-1 text-heading font-semibold text-ink">
                Skip this opportunity?
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

          <Dialog.Description className="mt-2 text-meta text-ink-secondary">
            Bámi will mark this role as skipped so you don&apos;t waste time on it. Why are you passing on this role? (Optional)
          </Dialog.Description>

          <div className="mt-4 space-y-2">
            {SKIP_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left p-3 rounded-lg border text-meta flex items-center justify-between transition-ui ${
                    isSelected
                      ? "border-brand bg-brand-subtle/50 text-brand font-medium"
                      : "border-line bg-surface text-ink hover:bg-inset/50"
                  }`}
                >
                  <span>{reason}</span>
                  {isSelected && <Check className="h-4 w-4 text-brand" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleConfirm}
              className="text-danger hover:border-danger hover:text-danger"
            >
              Confirm Skip
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
