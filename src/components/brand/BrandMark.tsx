import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Pixel size of the (square) mark. */
  size?: number;
}

/**
 * BrandMark — the small icon derived from the lowercase "b" and the
 * acute accent of "bámi". A stem, a bowl, and one diagonal stroke.
 * Kept deliberately simple; also used as the favicon (src/app/icon.svg).
 */
export function BrandMark({ className, size = 24 }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      {/* stem */}
      <path
        d="M11.5 8.5v15"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* bowl */}
      <circle cx="17.2" cy="18.2" r="5" stroke="#fff" strokeWidth="3.2" />
      {/* the accent — diagonal stroke */}
      <path
        d="M19.6 6.2l3.4-2"
        stroke="#fff"
        strokeOpacity="0.75"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
