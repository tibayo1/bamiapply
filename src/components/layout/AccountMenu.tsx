"use client";

import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mock-data";

const itemClass = cn(
  "transition-ui flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-body text-ink outline-none select-none",
  "data-[highlighted]:bg-inset"
);

/**
 * AccountMenu — avatar + name at the bottom of the sidebar.
 * Opens a small Radix menu (keyboard + typeahead + focus return).
 * Identity comes from mock data until auth exists.
 */
export function AccountMenu({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${mockUser.name}`}
          className={cn(
            "focus-ring transition-ui flex items-center rounded-md hover:bg-ink/[0.05] data-[state=open]:bg-ink/[0.06]",
            collapsed ? "mx-auto h-9 w-9 justify-center" : "w-full gap-2.5 p-2 text-left"
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-micro font-semibold text-white"
          >
            {mockUser.initials}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-meta font-medium text-ink">{mockUser.name}</span>
                <span className="block truncate text-micro text-ink-muted">{mockUser.plan}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            </>
          )}
        </button>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Content
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          sideOffset={8}
          collisionPadding={12}
          className="menu-surface z-50 w-56 rounded-lg border border-line bg-surface p-1 shadow-float"
        >
          <div className="px-2 pb-2 pt-1.5">
            <p className="truncate text-meta font-medium text-ink">{mockUser.name}</p>
            <p className="truncate text-micro text-ink-muted">{mockUser.email}</p>
          </div>
          <Menu.Separator className="-mx-1 mb-1 h-px bg-line" />
          <Menu.Item asChild>
            <Link href="/profile" className={itemClass}>
              <UserRound className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              Career profile
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link href="/settings" className={itemClass}>
              <Settings className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              Settings
            </Link>
          </Menu.Item>
          <Menu.Separator className="-mx-1 my-1 h-px bg-line" />
          <Menu.Item asChild>
            <Link href="/signin" className={itemClass}>
              <LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              Sign out
            </Link>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
