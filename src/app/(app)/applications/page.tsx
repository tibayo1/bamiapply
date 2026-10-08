import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ApplicationsExplorer } from "@/components/applications/ApplicationsExplorer";
import { mockApplications } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  const applications = mockApplications;

  return (
    <PageContainer width="wide" className="space-y-8">
      <PageHeader
        title="Applications"
        description="Track every role from discovery to decision."
        actions={
          <Link href="/dashboard#job-input" className={buttonVariants({ variant: "primary" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add application
          </Link>
        }
      />
      <ApplicationsExplorer applications={applications} />
    </PageContainer>
  );
}
