import type { Metadata } from "next";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";

export const metadata: Metadata = { title: "Application" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Browser storage is resolved after hydration inside the client boundary.
  return <ApplicationDetail id={id} />;
}
