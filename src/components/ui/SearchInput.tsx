import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name — defaults to the placeholder. */
  label?: string;
  className?: string;
}

/** SearchInput — quiet field with search icon and a clear button. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cn(
          "transition-ui h-9 w-full rounded-md border border-line bg-surface pl-9 pr-8 text-body text-ink",
          "placeholder:text-ink-muted hover:border-line-strong",
          "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
          "[&::-webkit-search-cancel-button]:hidden"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="focus-ring transition-ui absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-ink-muted hover:bg-inset hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
