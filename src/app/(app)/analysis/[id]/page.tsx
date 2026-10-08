import type { Metadata } from "next";
import { buildJobAnalysis } from "@/lib/analysis/mock-engine";
import { hamiltonJob } from "@/lib/analysis/mock-hamilton";
import { createDemoProfile } from "@/lib/profile/mock-profile";
import { JobAnalysisView } from "@/components/analysis/JobAnalysisView";

export const metadata: Metadata = {
  title: "Job Analysis",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JobAnalysisPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const shouldSimulate = sp.simulate === "true";

  // Build the analysis deterministically from demo baseline
  const demoProfile = createDemoProfile();
  const analysis = buildJobAnalysis({
    profile: demoProfile,
    job: { ...hamiltonJob, id },
  });

  return (
    <JobAnalysisView
      initialAnalysis={analysis}
      simulateLoadingOnMount={shouldSimulate}
    />
  );
}
