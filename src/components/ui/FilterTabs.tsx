"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface FilterTabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
}

interface FilterTabsProps<K extends string> {
  items: FilterTabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * FilterTabs — underline tabs with counts. The selected tab gets the
 * Bámi accent underline (flat bar, slanted right cut).
 * Arrow keys move between tabs (roving tabindex).
 */
export function FilterTabs<K extends string>({
  items,
  active,
  onChange,
  ariaLabel,
  className,
}: FilterTabsProps<K>) {
  const id = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const index = items.findIndex((i) => i.key === active);
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    onChange(items[next].key);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${id}-${items[next].key}"]`)?.focus();
    e.preventDefault();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("-mb-px flex items-end gap-1 overflow-x-auto", className)}
    >
      {items.map(({ key, label, count }) => {
        const selected = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            data-tab={`${id}-${key}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            className={cn(
              "focus-ring transition-ui relative inline-flex h-10 shrink-0 items-center gap-2 rounded-sm px-2.5 text-body",
              selected ? "font-medium text-ink" : "text-ink-secondary hover:text-ink"
            )}
          >
            {label}
            {count !== undefined && (
              <span
                className={cn(
                  "tabular-nums text-meta",
                  selected ? "text-brand" : "text-ink-muted"
                )}
              >
                {count}
              </span>
            )}
            {selected && (
              <span aria-hidden="true" className="accent-underline absolute inset-x-2.5 bottom-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
