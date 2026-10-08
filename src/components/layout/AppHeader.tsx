"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu } from "lucide-react";
import { resolveNavItem } from "@/config/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Tooltip } from "@/components/ui/Tooltip";
import { useSidebar } from "./SidebarContext";

/**
 * AppHeader — restrained top bar.
 * Left: drawer trigger + logo (below lg) or the current location (lg+).
 * Right: notifications placeholder. Identity lives in the sidebar only.
 * Contains no <h1>: each page owns its own heading.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();
  const current = resolveNavItem(pathname);
  const isDetail = current && pathname !== current.href;
  const isAnalysis = pathname.startsWith("/analysis");

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="focus-ring transition-ui flex h-10 w-10 items-center justify-center rounded-md text-ink-secondary hover:bg-ink/[0.05] hover:text-ink lg:hidden"
        >
          <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>

        <BrandLogo href="/dashboard" className="lg:hidden" />

        {isAnalysis ? (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-meta lg:flex">
            <Link
              href="/dashboard"
              className="focus-ring transition-ui rounded-sm text-ink-muted hover:text-ink"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            <span className="truncate font-medium text-ink" aria-current="page">
              Job analysis
            </span>
          </nav>
        ) : current ? (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-meta lg:flex">
            {isDetail ? (
              <>
                <Link
                  href={current.href}
                  className="focus-ring transition-ui rounded-sm text-ink-muted hover:text-ink"
                >
                  {current.label}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                <span className="truncate font-medium text-ink" aria-current="page">
                  Application
                </span>
              </>
            ) : (
              <span className="font-medium text-ink" aria-current="page">
                {current.label}
              </span>
            )}
          </nav>
        ) : null}
      </div>

      <Tooltip label="Notifications" side="bottom">
        <button
          type="button"
          aria-label="Notifications"
          className="focus-ring transition-ui flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-ink/[0.05] hover:text-ink"
        >
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden="true" />
        </button>
      </Tooltip>
    </header>
  );
}
