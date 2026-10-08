"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AccountMenu } from "./AccountMenu";
import { SidebarNav } from "./SidebarNav";
import { useSidebar } from "./SidebarContext";

/**
 * MobileNav — the sidebar as a left drawer below lg.
 * Radix Dialog supplies focus trap, Escape to close and scroll lock.
 */
export function MobileNav() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();

  // Close after navigating.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-surface fixed inset-0 z-40 bg-ink/30 lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="drawer-surface fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-line bg-sidebar outline-none lg:hidden"
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <div className="flex h-12 items-center justify-between px-5">
            <BrandLogo href="/dashboard" />
            <Dialog.Close
              aria-label="Close navigation"
              className="focus-ring transition-ui -mr-2 flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-ink/[0.05] hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto pt-2">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="border-t border-line p-3">
            <AccountMenu />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
