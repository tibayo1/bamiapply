"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { searchProfile, type ProfileSearchResult } from "@/lib/profile/search";
import type { CareerProfile } from "@/types/profile";
import type { SectionId } from "@/lib/profile/sections";

interface ProfileSearchProps {
  profile: CareerProfile;
  onSelectResult: (section: SectionId, id?: string) => void;
}

const SECTION_LABELS: Record<SectionId, string> = {
  overview: "Overview",
  experience: "Experience",
  education: "Education",
  research: "Research",
  skills: "Skills",
  achievements: "Achievements",
  stories: "Stories",
  preferences: "Preferences",
};

export function ProfileSearch({ profile, onSelectResult }: ProfileSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = searchProfile(profile, query);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: ProfileSearchResult) => {
    onSelectResult(result.section, result.id);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
          placeholder="Search claims, skills, projects..."
          className="w-full rounded-lg border border-line bg-surface pl-9 pr-8 py-2 text-meta text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none transition-ui shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-line bg-surface p-1.5 shadow-lg max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-center text-meta text-ink-muted">
              No matching records or claims found
            </div>
          ) : (
            <div className="space-y-0.5">
              {results.map((res) => (
                <button
                  key={`${res.section}-${res.id}`}
                  type="button"
                  onClick={() => handleSelect(res)}
                  className="w-full flex items-start justify-between gap-2 rounded-lg p-2.5 text-left hover:bg-canvas transition-ui group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brand-subtle px-1.5 py-0.5 font-mono text-micro font-medium text-brand">
                        {SECTION_LABELS[res.section]}
                      </span>
                      <span className="font-semibold text-meta text-ink truncate">
                        {res.title}
                      </span>
                    </div>
                    <p className="mt-1 text-micro text-ink-secondary truncate">
                      {res.matchText}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-brand shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
