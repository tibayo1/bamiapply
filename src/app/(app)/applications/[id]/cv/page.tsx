import type { Metadata } from "next";
import { CVBuilder } from "@/components/cv/CVBuilder";

export const metadata: Metadata = { title: "Tailored CV" };

export default async function CVBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CVBuilder id={id} />;
}
