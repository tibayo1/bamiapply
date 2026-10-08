import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";

export const metadata: Metadata = {
  title: "Career Profile | Bámi Apply",
  description:
    "Structured, verified career evidence powering honest application analysis and tailored CVs.",
};

export default function ProfilePage() {
  return (
    <PageContainer width="wide" className="py-6 sm:py-8">
      <ProfileWorkspace />
    </PageContainer>
  );
}

