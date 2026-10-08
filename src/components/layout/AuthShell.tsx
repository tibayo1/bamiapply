import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { buttonVariants } from "@/components/ui/Button";

interface AuthShellProps {
  /** Optional right-hand nav link text + href. */
  action?: { label: string; href: string };
  children: React.ReactNode;
}

/** Shared frame for the public sign-in / onboarding pages. */
export function AuthShell({ action, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-wide items-center justify-between px-4 sm:px-6 lg:px-10">
        <BrandLogo showSuffix />
        {action && (
          <Link href={action.href} className={buttonVariants({ variant: "ghost" })}>
            {action.label}
          </Link>
        )}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-14">
        {children}
      </main>
    </div>
  );
}
