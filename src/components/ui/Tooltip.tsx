"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <RadixTooltip.Provider delayDuration={250} skipDelayDuration={150}>
    {children}
  </RadixTooltip.Provider>
);

interface TooltipProps {
  label: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  /** When false the tooltip is not rendered at all. */
  enabled?: boolean;
}

/** Small, quiet tooltip. Used for icon-only controls. */
export function Tooltip({ label, children, side = "right", enabled = true }: TooltipProps) {
  if (!enabled) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="tooltip-surface z-50 rounded-md bg-ink px-2 py-1 text-micro font-medium text-white shadow-float"
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
