import { SidebarProvider } from "@/components/layout/SidebarContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { TooltipProvider } from "@/components/ui/Tooltip";

import { ProfileProvider } from "@/lib/profile/context";

/**
 * Authenticated shell. Wraps everything under (app)/.
 * Public routes (landing, signin, onboarding) use the root layout only.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <TooltipProvider>
        <SidebarProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-meta focus:font-medium focus:shadow-float"
        >
          Skip to content
        </a>
        <div className="flex h-dvh overflow-hidden">
          <AppSidebar />
          <MobileNav />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
    </ProfileProvider>
  );
}
