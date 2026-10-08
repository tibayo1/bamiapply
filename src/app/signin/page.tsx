"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Info } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const field = cn(
  "transition-ui h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-body text-ink",
  "placeholder:text-ink-muted hover:border-ink-muted/50",
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
);

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Authentication is not implemented yet: this opens the demo workspace.
    router.push("/dashboard");
  }

  return (
    <AuthShell action={{ label: "Get started", href: "/onboarding" }}>
      <div className="w-full max-w-sm">
        <h1 className="text-title font-semibold text-ink">Welcome back</h1>
        <p className="mt-1.5 text-body text-ink-secondary">Sign in to pick up where you left off.</p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-line bg-surface p-5 sm:p-6"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-meta font-medium text-ink">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={field}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-meta font-medium text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                className={cn(field, "pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="focus-ring transition-ui absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-inset hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full">
            Sign in
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>

        <p className="mt-4 flex items-start gap-2 text-meta text-ink-muted">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Accounts aren&apos;t connected yet. Signing in opens the demo workspace.
        </p>

        <p className="mt-6 text-body text-ink-secondary">
          New to Bámi?{" "}
          <Link
            href="/onboarding"
            className="focus-ring transition-ui rounded-sm font-medium text-brand hover:text-brand-hover"
          >
            Get started
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
