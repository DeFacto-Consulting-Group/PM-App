"use client";

import { useEffect, useState } from "react";
import { MentionsInput, Mention } from "react-mentions";
import { cn } from "@/lib/utils";

type MentionUser = { id: string | number; display?: string };

/** Fallback when /api/users returns no one (e.g. Supabase off) so @ still demos. */
const DEMO_MENTION_USERS: MentionUser[] = [
  { id: "demo-jh", display: "John Harrison" },
  { id: "demo-sc", display: "Sarah Chen" },
  { id: "demo-mt", display: "Michael Torres" },
  { id: "demo-ew", display: "Emily Walsh" },
  { id: "demo-rk", display: "Robert Kim" },
];

const mentionsStyles = {
  control: {
    fontSize: 14,
    fontWeight: "normal" as const,
  },
  "&multiLine": {
    control: {
      minHeight: 100,
    },
    highlighter: {
      padding: "8px 10px",
      border: "1px solid transparent",
      borderRadius: 8,
    },
    input: {
      padding: "8px 10px",
      outline: "none",
      border: "1px solid var(--border)",
      borderRadius: 8,
      backgroundColor: "transparent",
      /* Text/caret color: globals.css .notes-mentions-field textarea (transparent + caret) */
      color: "transparent",
      caretColor: "var(--foreground)",
    },
  },
  suggestions: {
    list: {
      backgroundColor: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      fontSize: 14,
      maxHeight: 200,
      overflow: "auto",
      boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)",
      zIndex: 50,
    },
    item: {
      padding: "8px 12px",
      borderBottom: "1px solid var(--border)",
      "&focused": {
        backgroundColor: "var(--muted)",
      },
    },
  },
};

export interface NotesMentionsFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  className?: string;
}

export function NotesMentionsField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  "aria-invalid": ariaInvalid,
  className,
}: NotesMentionsFieldProps) {
  const [mentionData, setMentionData] = useState<MentionUser[]>(DEMO_MENTION_USERS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const json = (await res.json()) as {
          users?: Array<{
            id: string;
            first_name: string;
            last_name: string;
          }>;
        };
        const rows = json.users ?? [];
        if (cancelled || rows.length === 0) return;
        setMentionData(
          rows.map((u) => ({
            id: u.id,
            display: `${u.first_name} ${u.last_name}`.trim() || u.id,
          }))
        );
      } catch {
        /* keep demo users */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn("notes-mentions-field w-full", className)}>
      <MentionsInput
        id={id}
        value={value}
        onChange={(_e, newValue) => onChange(newValue)}
        placeholder={placeholder}
        disabled={disabled}
        style={mentionsStyles}
        a11ySuggestionsListLabel="Suggested teammates"
        className={cn(ariaInvalid && "aria-invalid")}
        singleLine={false}
      >
        {/* Explicit props — React 19 may not apply Mention defaultProps; library reads props directly in addMention */}
        <Mention
          trigger="@"
          markup="@[__display__](__id__)"
          displayTransform={(id, display) => display ?? String(id)}
          /* Color also set in CSS so mirror matches link teal */
          style={{ color: "#0d9488", fontWeight: 600 }}
          data={mentionData}
          appendSpaceOnAdd
        />
      </MentionsInput>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Type <kbd className="rounded border px-1 py-0.5 font-mono text-[0.7rem]">@</kbd>{" "}
        to tag a teammate. Mentions are saved with the note.
      </p>
    </div>
  );
}
