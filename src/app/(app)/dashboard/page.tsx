import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { Greeting } from "@/components/dashboard/Greeting";
import { JobInput } from "@/components/dashboard/JobInput";
import { ApplicationsExplorer } from "@/components/applications/ApplicationsExplorer";
import { mockApplications, mockUser } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  // Swap for a database query when the backend arrives.
  const applications = mockApplications;

  return (
    <PageContainer width="content" className="space-y-8 sm:space-y-10">
      <Greeting name={mockUser.firstName} />

      <JobInput />

      <section aria-labelledby="continue-heading">
        <h2 id="continue-heading" className="mb-4 text-heading font-semibold text-ink">
          Continue where you left off
        </h2>
        <ApplicationsExplorer applications={applications} limit={6} />
      </section>
    </PageContainer>
  );
}
