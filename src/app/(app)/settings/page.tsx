import type { Metadata } from "next";
import { Bell, CreditCard, ShieldCheck, UserRound } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Settings" };

const sections = [
  { icon: UserRound, label: "Account", description: "Your name, email address and sign-in details." },
  { icon: Bell, label: "Notifications", description: "When and how you hear about your applications." },
  { icon: ShieldCheck, label: "Privacy & data", description: "Export your data or delete your account." },
  { icon: CreditCard, label: "Plan & billing", description: "Your plan and payment details." },
];

export default function SettingsPage() {
  return (
    <PageContainer width="narrow" className="space-y-8">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <ul className="overflow-hidden rounded-xl border border-line bg-surface">
        {sections.map(({ icon: Icon, label, description }) => (
          <li
            key={label}
            className="flex items-center gap-4 border-t border-line px-5 py-4 first:border-t-0"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-inset text-ink-muted">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-ink">{label}</p>
              <p className="text-meta text-ink-secondary">{description}</p>
            </div>
            <span className="shrink-0 text-meta text-ink-muted">Coming soon</span>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
