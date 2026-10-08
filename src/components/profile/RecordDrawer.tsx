"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RecordDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => void;
  formId?: string;
  saveLabel?: string;
  isSaving?: boolean;
}

export function RecordDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  formId,
  saveLabel = "Save changes",
  isSaving = false,
}: RecordDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-surface shadow-preview border-l border-line focus:outline-none sm:max-w-2xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line px-6 py-5 shrink-0 bg-surface">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
                <span className="font-bold text-brand mr-0.5">/</span>
                CAREER EVIDENCE
              </div>
              <Dialog.Title className="mt-1 text-heading font-semibold text-ink">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-meta text-ink-secondary">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="focus-ring transition-ui rounded-md p-1.5 text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {children}
          </div>

          {/* Sticky Footer */}
          {(onSave || formId) && (
            <div className="flex items-center justify-end gap-3 border-t border-line bg-surface px-6 py-4 shrink-0 shadow-float">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type={formId ? "submit" : "button"}
                form={formId}
                variant="primary"
                onClick={onSave}
                disabled={isSaving}
              >
                {saveLabel}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
