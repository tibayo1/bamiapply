import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Mail, MessageSquareText, Upload } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, buttonVariants } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Documents" };

const kinds = [
  { icon: FileText, label: "CVs", description: "Role-specific CVs built from your profile." },
  { icon: Mail, label: "Cover letters", description: "Letters written around each opportunity." },
  { icon: MessageSquareText, label: "Application answers", description: "Answers drawn from your real experience." },
];

export default function DocumentsPage() {
  return (
    <PageContainer width="narrow" className="space-y-8">
      <PageHeader
        title="Documents"
        description="Everything Bámi prepares for your applications, organised by role."
        actions={
          <Button variant="ghost" disabled title="Uploads are coming soon">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <ul className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {kinds.map(({ icon: Icon, label, description }) => (
            <li key={label} className="p-5">
              <div className="flex items-center justify-between">
                <Icon className="h-[18px] w-[18px] text-ink-muted" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-meta tabular-nums text-ink-muted">0</span>
              </div>
              <p className="mt-3 text-body font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-meta text-ink-secondary">{description}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-line">
          <EmptyState
            title="Nothing prepared yet"
            description="As you build applications, the CVs, cover letters and answers Bámi prepares will collect here."
            action={
              <Link href="/dashboard#job-input" className={buttonVariants({ variant: "primary" })}>
                Analyse a job
              </Link>
            }
          />
        </div>
      </div>
    </PageContainer>
  );
}
