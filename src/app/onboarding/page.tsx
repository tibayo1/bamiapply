"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FileText, UploadCloud } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (f) setFile(f);
  }

  return (
    <AuthShell action={{ label: "Sign in", href: "/signin" }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="accent-underline w-10" />
          <span className="h-0.5 w-10 bg-line-strong" />
          <span className="h-0.5 w-10 bg-line-strong" />
        </div>
        <p className="mt-4 text-meta font-medium text-ink-muted">Step 1 of 3</p>
        <h1 className="mt-1 text-title font-semibold text-ink">Let&apos;s build your career profile.</h1>
        <p className="mt-2 max-w-md text-body text-ink-secondary">
          Start with a CV you already have, or build your profile by hand. You&apos;ll review
          everything before it&apos;s saved.
        </p>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "transition-ui mt-8 flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand",
            dragging
              ? "border-brand bg-brand-subtle"
              : file
                ? "border-success-line bg-success-subtle"
                : "border-line-strong bg-surface hover:border-ink-muted hover:bg-canvas"
          )}
        >
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => pick(e.target.files)}
            className="sr-only"
          />
          {file ? (
            <>
              <FileText className="h-6 w-6 text-success" strokeWidth={1.7} aria-hidden="true" />
              <span className="mt-3 text-body font-semibold text-ink">{file.name}</span>
              <span className="mt-0.5 text-meta text-ink-secondary">
                {Math.max(1, Math.round(file.size / 1024))} KB · Click to choose a different file
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-ink-muted" strokeWidth={1.7} aria-hidden="true" />
              <span className="mt-3 text-body font-semibold text-ink">
                Drop your CV here, or <span className="text-brand">browse</span>
              </span>
              <span className="mt-0.5 text-meta text-ink-muted">PDF or DOCX</span>
            </>
          )}
        </label>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            disabled={!file}
            onClick={() => router.push("/profile")}
            className="sm:flex-1"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Link
            href="/profile"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "sm:flex-1")}
          >
            Build profile manually
          </Link>
        </div>

        <p className="mt-5 text-meta text-ink-muted">
          Files aren&apos;t uploaded or read yet. This step previews the flow only.
        </p>
      </div>
    </AuthShell>
  );
}
