"use client";

import { Check, HelpCircle, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/types/profile";

interface VerificationLabelProps {
  status: VerificationStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
  onConfirm?: () => void;
}

export function VerificationLabel({
  status,
  size = "md",
  showIcon = true,
  className,
  onConfirm,
}: VerificationLabelProps) {
  if (status === "verified") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono uppercase tracking-wider text-ink-muted",
          size === "sm" ? "text-[0.625rem]" : "text-[0.6875rem]",
          className
        )}
      >
        {showIcon && <Check className="h-3 w-3 text-success stroke-[2.5]" />}
        <span>Verified</span>
      </span>
    );
  }

  if (status === "needs_confirmation") {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded font-mono font-medium uppercase tracking-wider bg-warning-subtle text-warning border border-warning/20",
            size === "sm" ? "px-1.5 py-0.5 text-[0.625rem]" : "px-2 py-0.5 text-[0.6875rem]"
          )}
        >
          {showIcon && <HelpCircle className="h-3 w-3 stroke-[2]" />}
          <span>Needs confirmation</span>
        </span>
        {onConfirm && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="text-micro font-mono text-brand hover:underline font-semibold"
          >
            Confirm
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded font-mono font-medium uppercase tracking-wider bg-inset text-ink-muted border border-line",
          size === "sm" ? "px-1.5 py-0.5 text-[0.625rem]" : "px-2 py-0.5 text-[0.6875rem]"
        )}
      >
        {showIcon && <FileEdit className="h-3 w-3" />}
        <span>Draft</span>
      </span>
      {onConfirm && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          className="text-micro font-mono text-brand hover:underline font-semibold"
        >
          Confirm
        </button>
      )}
    </div>
  );
}
