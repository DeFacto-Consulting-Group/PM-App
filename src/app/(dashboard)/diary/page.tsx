"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DIARY_STORAGE_EVENT,
  getDiaryEntries,
  type DiaryEntry,
  upsertDiaryEntry,
  deleteDiaryEntry,
} from "@/lib/diary-storage";

function formatDateForTable(yyyyMmDd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatInputDateForTable(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

type Draft = {
  id: string;
  linked_project: string;
  follow_up_date: string;
  notes: string;
  input_date: string;
};

function makeId() {
  return `diary-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function localDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DiaryPage() {
  const [query, setQuery] = useState("");
  /** Empty until mount so SSR + first client paint match (localStorage differs from server seed). */
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [diaryReady, setDiaryReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiaryEntry | null>(null);
  const [todayYmd, setTodayYmd] = useState("");

  useEffect(() => {
    setEntries(getDiaryEntries());
    setTodayYmd(localDateYmd(new Date()));
    setDiaryReady(true);

    const onUpdate = () => setEntries(getDiaryEntries());
    window.addEventListener(DIARY_STORAGE_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(DIARY_STORAGE_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const haystack = `${e.linked_project}\n${e.follow_up_date}\n${e.notes}\n${e.input_date}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diary Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="pl-9 w-56"
            />
          </div>
          <Button
            size="icon-sm"
            disabled={!diaryReady}
            onClick={() => {
              const now = new Date().toISOString();
              const next: Draft = {
                id: makeId(),
                linked_project: "",
                follow_up_date: "",
                notes: "",
                input_date: now,
              };
              setDraft(next);
              setIsOpen(true);
            }}
            aria-label="Add New"
            title="Add New"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Linked Project</TableHead>
              <TableHead className="w-[16%]">Follow up Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[18%]">Input Date</TableHead>
              <TableHead className="w-[88px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!diaryReady && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading diary entries…
                </TableCell>
              </TableRow>
            )}
            {diaryReady &&
              filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.linked_project}</TableCell>
                <TableCell>{formatDateForTable(row.follow_up_date)}</TableCell>
                <TableCell className="whitespace-normal">{row.notes}</TableCell>
                <TableCell>{formatInputDateForTable(row.input_date)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setFormError(null);
                        setDraft({ ...row });
                        setIsOpen(true);
                      }}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeleteTarget(row);
                      }}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {diaryReady && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No diary entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setDraft(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.linked_project ? "Edit Diary Entry" : "Add Diary Entry"}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Linked Project</Label>
                <Input
                  value={draft.linked_project}
                  onChange={(e) =>
                    setDraft((prev) => (prev ? { ...prev, linked_project: e.target.value } : prev))
                  }
                  placeholder="e.g. 1200 Classico Holdings"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Follow up Date</Label>
                <Input
                  type="date"
                  min={todayYmd || undefined}
                  value={draft.follow_up_date}
                  onChange={(e) =>
                    setDraft((prev) => (prev ? { ...prev, follow_up_date: e.target.value } : prev))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                  }
                  placeholder="Add notes…"
                  rows={5}
                />
              </div>
            </div>
          )}

          <DialogFooter className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              {draft &&
                entries.some((e) => e.id === draft.id) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      const existing = entries.find((e) => e.id === draft.id) ?? null;
                      if (existing) setDeleteTarget(existing);
                    }}
                  >
                    Delete
                  </Button>
                )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setDraft(null);
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!draft?.linked_project.trim()}
                onClick={() => {
                  if (!draft) return;
                  setFormError(null);
                if (
                  todayYmd &&
                  draft.follow_up_date &&
                  draft.follow_up_date < todayYmd
                ) {
                  setFormError("Follow up date cannot be in the past.");
                  return;
                }
                  const entry: DiaryEntry = {
                    id: draft.id,
                    linked_project: draft.linked_project.trim(),
                    follow_up_date: draft.follow_up_date,
                    notes: draft.notes.trim(),
                    input_date: draft.input_date || new Date().toISOString(),
                  };
                  upsertDiaryEntry(entry);
                  setIsOpen(false);
                  setDraft(null);
                }}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete diary entry?</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                This can’t be undone.
              </p>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="font-medium">{deleteTarget.linked_project}</div>
                {deleteTarget.follow_up_date ? (
                  <div className="text-xs text-muted-foreground">
                    Follow up: {formatDateForTable(deleteTarget.follow_up_date)}
                  </div>
                ) : null}
                {deleteTarget.notes?.trim() ? (
                  <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                    {deleteTarget.notes.trim()}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                deleteDiaryEntry(deleteTarget.id);
                if (draft?.id === deleteTarget.id) {
                  setIsOpen(false);
                  setDraft(null);
                  setFormError(null);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

