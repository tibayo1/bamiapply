"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ListEditorProps {
  label: string;
  description?: string;
  placeholder?: string;
  items: string[];
  onChange: (items: string[]) => void;
  addButtonLabel?: string;
}

export function ListEditor({
  label,
  description,
  placeholder = "Add an item...",
  items,
  onChange,
  addButtonLabel = "Add item",
}: ListEditorProps) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-meta font-medium text-ink">{label}</label>
        {description && (
          <p className="text-micro text-ink-muted">{description}</p>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                className="flex-1 rounded-md border border-line-strong bg-canvas px-3 py-1.5 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-ink-muted hover:text-danger p-1.5 rounded transition-ui"
                aria-label={`Remove ${item}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-line-strong bg-canvas px-3 py-1.5 text-body text-ink placeholder:text-ink-muted focus:border-brand focus:bg-surface focus:outline-none"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!draft.trim()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {addButtonLabel}
        </Button>
      </div>
    </div>
  );
}
