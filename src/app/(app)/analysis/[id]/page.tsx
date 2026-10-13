import type { Metadata } from "next";
import { JobAnalysisRoute } from "@/components/jobs/JobAnalysisRoute";

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

  return (
    <JobAnalysisRoute id={id} shouldSimulate={shouldSimulate} />
  );
}
