import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/applications/ApplicationsWorkspace";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <DashboardWorkspace />;
}
