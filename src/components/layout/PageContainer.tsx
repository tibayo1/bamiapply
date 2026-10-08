import { cn } from "@/lib/utils";

type Width = "wide" | "content" | "narrow";

const widths: Record<Width, string> = {
  /** ~1160px — data-heavy pages (Applications) */
  wide: "max-w-wide",
  /** ~1040px — workspace pages (Dashboard, Profile) */
  content: "max-w-content",
  /** ~896px — document-oriented pages (Detail, Documents, Settings) */
  narrow: "max-w-narrow",
};

interface PageContainerProps {
  width?: Width;
  className?: string;
  children: React.ReactNode;
}

/**
 * PageContainer — one place that decides content width and page gutters,
 * so every authenticated page lines up inside the workspace.
 */
export function PageContainer({ width = "content", className, children }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10",
        widths[width],
        className
      )}
    >
      {children}
    </div>
  );
}
