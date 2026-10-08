import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

/** Shown by Next.js while an app route is loading. */
export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <LoadingIndicator />
    </div>
  );
}
