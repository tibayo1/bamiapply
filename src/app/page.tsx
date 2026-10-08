import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { brand } from "@/config/brand";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { buttonVariants } from "@/components/ui/Button";
import { AnalysisPreview } from "@/components/marketing/AnalysisPreview";
import { Capabilities } from "@/components/marketing/Capabilities";

const container = "mx-auto w-full max-w-wide xl:max-w-6xl 2xl:max-w-[82rem] px-4 sm:px-6 lg:px-10";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink overflow-x-clip">
      {/* Editorial Header */}
      <header className="border-b border-line bg-canvas/80 backdrop-blur-sm sticky top-0 z-30">
        <nav aria-label="Main navigation" className={`${container} flex h-16 items-center justify-between`}>
          <BrandLogo showSuffix />
          <div className="flex items-center gap-2">
            <Link href="/signin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/onboarding" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Asymmetric Hero Composition */}
        <section className={`${container} pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-16 lg:pb-24 xl:pt-20 xl:pb-28`}>
          <div className="grid lg:grid-cols-12 gap-10 xl:gap-14 items-start">
            {/* Left Column: Thesis & Value Proposition */}
            <div className="lg:col-span-5 flex flex-col justify-center min-w-0">
              {/* Editorial Eyebrow */}
              <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
                <span className="font-bold text-brand mr-0.5">/</span>
                YOUR CAREER COPILOT
              </div>

              {/* Confident, Tight Headline */}
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.85rem] 2xl:text-[4.25rem] font-semibold tracking-[-0.04em] text-ink leading-[1.02]">
                Stop applying<br className="hidden sm:inline" /> blindly.
              </h1>

              {/* Subheading */}
              <p className="mt-5 text-lead text-ink-secondary leading-relaxed max-w-xl">
                Know which opportunities are worth your time, then build an application around your real experience.
              </p>

              {/* Two Core Ideas: Deciding fit + Building from real experience */}
              <div className="mt-8 space-y-4 border-l border-line-strong pl-4 text-left">
                <div>
                  <p className="text-body font-semibold text-ink">
                    01 / Decide before you invest
                  </p>
                  <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
                    Evaluate your fit, surface critical gaps, and verify whether a role warrants your effort before writing a single sentence.
                  </p>
                </div>
                <div>
                  <p className="text-body font-semibold text-ink">
                    02 / Ground every claim in truth
                  </p>
                  <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
                    Generate tailored CVs, cover letters, and application answers drawn strictly from verified career evidence. Verified experience.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg" })}>
                  Analyse a job
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/onboarding" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  Build your career profile
                </Link>
              </div>

              {/* Micro-reassurance */}
              <p className="mt-3.5 text-micro font-mono text-ink-muted">
                Free to test · Paste any job link or description to evaluate fit
              </p>

              {/* Editorial Anchor Proof Points to balance height with the preview */}
              <div className="mt-8 pt-6 border-t border-line grid grid-cols-2 gap-4 text-left min-w-0">
                <div className="min-w-0">
                  <span className="block text-meta font-semibold text-ink">Verified experience</span>
                  <span className="block text-micro text-ink-muted leading-tight mt-0.5">Strictly confirmed career evidence</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-meta font-semibold text-ink">Decision first</span>
                  <span className="block text-micro text-ink-muted leading-tight mt-0.5">Know your fit before writing a word</span>
                </div>
              </div>
            </div>

            {/* Right Column: Integrated Live Analysis Console */}
            <div className="lg:col-span-7 w-full min-w-0">
              <AnalysisPreview />
            </div>
          </div>
        </section>

        {/* Narrative Progression: One profile. Every application. */}
        <Capabilities />

        {/* Brand Conviction / Philosophical Section */}
        <section className="border-t border-line bg-canvas py-16 sm:py-24">
          <div className={container}>
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
                <span className="font-bold text-brand mr-1">/</span>
                THE BÁMI CONVICTION
              </div>
              <div className="lg:col-span-8 max-w-2xl">
                <blockquote className="text-xl sm:text-2xl font-medium tracking-tight text-ink leading-relaxed">
                  &ldquo;The strongest applications are not fabricated by generative prompts. They are excavated from the real evidence of your work.&rdquo;
                </blockquote>
                <p className="mt-4 text-meta text-ink-muted leading-relaxed">
                  From the Yoruba expression <span className="text-ink font-medium">&ldquo;bá mi&rdquo;</span>, meaning <span className="text-ink font-medium">&ldquo;help me.&rdquo;</span> A focused copilot designed for thoughtful, deliberate careers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-line bg-surface">
        <div className={`${container} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-8`}>
          <BrandLogo showSuffix />
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-meta text-ink-muted">
            <Link href="/signin" className="hover:text-ink transition-colors">Sign in</Link>
            <Link href="/onboarding" className="hover:text-ink transition-colors">Career Profile</Link>
            <Link href="/dashboard" className="hover:text-ink transition-colors">Dashboard</Link>
          </div>
          <p className="text-meta text-ink-muted font-mono text-[0.75rem]">
            © {new Date().getFullYear()} {brand.productName}
          </p>
        </div>
      </footer>
    </div>
  );
}
