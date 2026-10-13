"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProfileClaim } from "@/types/profile";
import { VerificationLabel } from "../VerificationLabel";
import { createUserClaim, removeClaim, updateClaimText } from "./claim-editing";

interface ClaimEditorProps {
  label: string;
  description?: string;
  placeholder?: string;
  claims: ProfileClaim[];
  onChange: (claims: ProfileClaim[]) => void;
  sourceRecordId?: string;
  addButtonLabel?: string;
}

export function ClaimEditor({
  label,
  description,
  placeholder = "Add a factual claim...",
  claims,
  onChange,
  sourceRecordId,
  addButtonLabel = "Add claim",
}: ClaimEditorProps) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    if (!draft.trim()) return;
    onChange([
      ...claims,
      createUserClaim(draft, `claim-${crypto.randomUUID()}`, sourceRecordId),
    ]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div>
        <span className="block text-meta font-medium text-ink">{label}</span>
        {description && <p className="text-micro text-ink-muted">{description}</p>}
      </div>

      {claims.length > 0 && (
        <ul className="space-y-2">
          {claims.map((claim, index) => (
            <li key={claim.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  pattern=".*\S.*"
                  aria-label={`${label} ${index + 1}`}
                  value={claim.text}
                  onChange={(e) => onChange(updateClaimText(claims, claim.id, e.target.value))}
                  className="flex-1 rounded-md border border-line-strong bg-canvas px-3 py-1.5 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChange(removeClaim(claims, claim.id))}
                  className="text-ink-muted hover:text-danger p-1.5 rounded transition-ui"
                  aria-label={`Remove ${claim.text}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <VerificationLabel status={claim.verificationStatus} size="sm" />
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          aria-label={`New ${label.toLowerCase()}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-line-strong bg-canvas px-3 py-1.5 text-body text-ink placeholder:text-ink-muted focus:border-brand focus:bg-surface focus:outline-none"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleAdd} disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {addButtonLabel}
        </Button>
      </div>
      <p className="text-micro text-ink-muted">
        Adding a claim confirms it is accurate. Changed claims need confirmation after saving;
        draft and imported claims keep their own status.
      </p>
    </div>
  );
}
