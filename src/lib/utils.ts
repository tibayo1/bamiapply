import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge needs to know our custom type-scale tokens are font
 * SIZES (text-meta), not colours (text-ink) — otherwise it would treat
 * `text-meta text-ink` as a conflict and drop one of them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "title", "heading", "lead", "body", "meta", "micro"] },
      ],
    },
  },
});

/** Merge Tailwind class names safely (clsx + conflict resolution). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date string into a human-readable relative label.
 * e.g. "Today", "2 days ago", "5 days ago"
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

/** Up to two initials from a name: "Hamilton Medical" → "HM", "Philips" → "PH". */
export function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
