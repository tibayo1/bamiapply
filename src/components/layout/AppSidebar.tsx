"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandMark } from "@/components/brand/BrandMark";
import { Tooltip } from "@/components/ui/Tooltip";
import { AccountMenu } from "./AccountMenu";
import { SidebarNav } from "./SidebarNav";
import { useSidebar } from "./SidebarContext";

/**
 * AppSidebar — desktop navigation (lg and up).
 * Quiet: same warm family as the page, no coloured panel.
 * Collapses to a 64px icon rail with tooltips.
 */
export function AppSidebar() {
  const { collapsed, toggle } = useSidebar();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-line bg-sidebar lg:flex",
        "transition-[width] duration-200 ease-[var(--ease-ui)]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-12 items-center", collapsed ? "justify-center" : "px-5")}>
        {collapsed ? (
          <BrandMark size={24} />
        ) : (
          <BrandLogo href="/dashboard" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className="flex flex-col gap-1 border-t border-line p-3">
        <Tooltip label={toggleLabel} enabled={collapsed}>
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className={cn(
              "focus-ring transition-ui flex h-8 items-center rounded-md text-meta text-ink-muted hover:bg-ink/[0.05] hover:text-ink",
              collapsed ? "mx-auto w-9 justify-center" : "gap-2.5 px-2.5"
            )}
          >
            <ToggleIcon className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
            {!collapsed && <span>Collapse</span>}
          </button>
        </Tooltip>
        <AccountMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
