import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";
import { BrandMark } from "./BrandMark";

interface BrandLogoProps {
  /** Public pages: "bámi apply". In-app: just "bámi". */
  showSuffix?: boolean;
  /** Hide the icon mark and render the wordmark only. */
  hideMark?: boolean;
  href?: string;
  className?: string;
}

/**
 * BrandLogo — icon mark + lowercase wordmark.
 * The wordmark is real text so the accent on "á" renders natively and
 * stays accessible. Strings come from brand config.
 */
export function BrandLogo({
  showSuffix = false,
  hideMark = false,
  href = "/",
  className,
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label={showSuffix ? brand.productName : brand.shortName}
      className={cn(
        "focus-ring inline-flex items-center gap-2 rounded-sm select-none",
        className
      )}
    >
      {!hideMark && <BrandMark size={22} />}
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[1.3125rem] font-semibold tracking-[-0.04em] text-ink">
          {brand.shortName}
        </span>
        {showSuffix && (
          <span className="text-meta font-medium tracking-[-0.005em] text-ink-muted">
            apply
          </span>
        )}
      </span>
    </Link>
  );
}
