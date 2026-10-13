import type { Metadata } from "next";
import { ApplicationsWorkspace } from "@/components/applications/ApplicationsWorkspace";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return <ApplicationsWorkspace />;
}
