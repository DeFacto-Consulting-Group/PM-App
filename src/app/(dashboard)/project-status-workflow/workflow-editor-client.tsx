"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectStatus } from "@/types/index";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/types/index";
import {
  DEFAULT_CONFLICT_TRANSITIONS,
  DEFAULT_DELIVERY_PIPELINE,
  buildMermaidFlowchart,
  clearWorkflowDraft,
  getDefaultWorkflowDraft,
  loadWorkflowDraft,
  saveWorkflowDraft,
  type ProjectStatusWorkflowDraft,
} from "@/lib/project-status-workflow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  GitBranch,
  RotateCcw,
  Save,
} from "lucide-react";

const EXCLUDED_FROM_DELIVERY: ProjectStatus[] = ["pending_conflict", "conflict_review"];

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", PROJECT_STATUS_COLORS[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

function WorkflowVisual({ pipeline }: { pipeline: ProjectStatus[] }) {
  const first = pipeline[0] ?? "pending_ea_retainer_auth";

  return (
    <div className="space-y-10">
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#102a43]">
          <GitBranch className="h-4 w-4" />
          Conflict intake
        </h3>
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <StatusBadge status="pending_conflict" />
            <ArrowDown className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-xs font-medium text-amber-900">Possible conflict (email)</p>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <StatusBadge status="conflict_review" />
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Cleared in app →</p>
              </div>
              <div className="flex flex-col items-center justify-start gap-2 text-center sm:pt-0">
                <p className="text-xs font-medium text-emerald-900">All clear (email)</p>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Skip review →</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">Merge to</span>
              <ArrowDown className="h-4 w-4 sm:hidden" />
              <ArrowRight className="hidden h-4 w-4 sm:block" />
            </div>
            <StatusBadge status={first} />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Mirrors behavior from the conflict email flow and project “Clear conflict” actions. Labels here are
          descriptive, not enforced in code until you implement changes.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-[#102a43]">Delivery lifecycle</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-min items-center gap-1 sm:gap-2">
            {pipeline.map((s, i) => (
              <div key={`${s}-${i}`} className="flex items-center gap-1 sm:gap-2">
                <div className="shrink-0 rounded-lg border bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/5">
                  <StatusBadge status={s} />
                </div>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Order below controls this row. Edit project / filters use the same status list from the app types.
        </p>
      </div>
    </div>
  );
}

const ALL_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

export function WorkflowEditorClient() {
  const [draft, setDraft] = useState<ProjectStatusWorkflowDraft>(() => getDefaultWorkflowDraft());
  const [copied, setCopied] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [addStageKey, setAddStageKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabaseEnabled =
      typeof process !== "undefined" &&
      typeof process.env?.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

    const fallback = () => {
      setDraft(loadWorkflowDraft());
      setIsLoading(false);
    };

    if (!supabaseEnabled) {
      fallback();
      return;
    }

    fetch("/api/workflow-templates/project-status")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load workflow template.");
        return (await r.json()) as { draft?: ProjectStatusWorkflowDraft; source?: string };
      })
      .then((data) => {
        if (data?.draft) {
          setDraft(data.draft);
        } else {
          fallback();
          return;
        }
        setIsLoading(false);
      })
      .catch(() => {
        fallback();
      });
  }, []);

  const pipeline = draft.deliveryPipeline.length ? draft.deliveryPipeline : DEFAULT_DELIVERY_PIPELINE;

  const mermaid = useMemo(() => buildMermaidFlowchart({ ...draft, deliveryPipeline: pipeline }), [draft, pipeline]);

  const availableToAdd = useMemo(
    () => ALL_STATUSES.filter((s) => !EXCLUDED_FROM_DELIVERY.includes(s) && !pipeline.includes(s)),
    [pipeline]
  );

  const move = (index: number, dir: -1 | 1) => {
    const next = [...pipeline];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setDraft((d) => ({ ...d, deliveryPipeline: next }));
    setSaveHint(null);
  };

  const removeAt = (index: number) => {
    if (pipeline.length <= 1) return;
    const next = pipeline.filter((_, i) => i !== index);
    setDraft((d) => ({ ...d, deliveryPipeline: next }));
    setSaveHint(null);
  };

  const addStatus = (status: ProjectStatus) => {
    setDraft((d) => ({ ...d, deliveryPipeline: [...d.deliveryPipeline, status] }));
    setSaveHint(null);
    setAddStageKey((k) => k + 1);
  };

  const updateTransitionLabel = (id: string, label: string) => {
    setDraft((d) => ({
      ...d,
      conflictLabelOverrides: { ...d.conflictLabelOverrides, [id]: label },
    }));
    setSaveHint(null);
  };

  const effectiveTransitions = useMemo(() => {
    return DEFAULT_CONFLICT_TRANSITIONS.map((t) => ({
      ...t,
      label: draft.conflictLabelOverrides[t.id] ?? t.label,
    }));
  }, [draft.conflictLabelOverrides]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveHint(null);
    // Always keep a local copy for resilience.
    saveWorkflowDraft(draft);

    const supabaseEnabled =
      typeof process !== "undefined" &&
      typeof process.env?.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

    if (!supabaseEnabled) {
      setIsSaving(false);
      setSaveHint("Saved in this browser (demo mode).");
      return;
    }

    try {
      const res = await fetch("/api/workflow-templates/project-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      if (!res.ok) {
        setIsSaving(false);
        setSaveHint("Saved locally, but failed to save to Supabase.");
        return;
      }
      setIsSaving(false);
      setSaveHint("Saved to Supabase (shared staging workflow).");
    } catch {
      setIsSaving(false);
      setSaveHint("Saved locally, but failed to save to Supabase.");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Clear your draft and restore defaults?")) return;
    clearWorkflowDraft();
    setDraft(getDefaultWorkflowDraft());
    setSaveHint("Reset to default.");
  };

  const copyMermaid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`\`\`\`mermaid\n${mermaid}\n\`\`\``);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [mermaid]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project status workflow</h1>
        <p className="text-muted-foreground">
          Current model: conflict branch, then delivery pipeline. Adjust the draft below to design changes—then
          update <code className="rounded bg-muted px-1 text-xs">ProjectStatus</code> in code when you implement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual flowchart</CardTitle>
          <CardDescription>
            Shipped defaults + your draft order for the delivery row. Conflict intake is fixed in this diagram
            shape (see API <code className="text-xs">/api/conflict/respond</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading workflow…</div>
          ) : (
            <WorkflowVisual pipeline={pipeline} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transition reference</CardTitle>
          <CardDescription>Editable labels for documentation; wire-up is separate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {effectiveTransitions.map((t) => (
            <div
              key={t.id}
              className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[auto_1fr] sm:items-center"
            >
              <div className="text-xs font-medium text-muted-foreground">
                {PROJECT_STATUS_LABELS[t.from]} → {PROJECT_STATUS_LABELS[t.to]}
              </div>
              <input
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={t.label}
                onChange={(e) => updateTransitionLabel(t.id, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery pipeline order</CardTitle>
          <CardDescription>Reorder stages (typical path after conflict resolution).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {pipeline.map((s, i) => (
              <li
                key={`${s}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2"
              >
                <div className="flex flex-1 items-center gap-2">
                  <StatusBadge status={s} />
                  <span className="font-mono text-xs text-muted-foreground">{s}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Move up"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Move down"
                    onClick={() => move(i, 1)}
                    disabled={i === pipeline.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeAt(i)}
                    disabled={pipeline.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {availableToAdd.length > 0 && (
            <div className="flex flex-wrap items-end gap-2 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Add stage</Label>
                <Select
                  key={addStageKey}
                  onValueChange={(v) => addStatus(v as ProjectStatus)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Choose status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Capture decisions for your team (saved with the draft).</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            placeholder="e.g. Add “On hold” between Active and Report Issued — needs PM approval rule…"
            value={draft.notes}
            onChange={(e) => {
              setDraft((d) => ({ ...d, notes: e.target.value }));
              setSaveHint(null);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mermaid (copy to Notion / Confluence / PR)</CardTitle>
          <CardDescription>Paste into any Mermaid-compatible editor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed whitespace-pre-wrap">
            {mermaid}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => void copyMermaid()}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy Mermaid"}
            </Button>
            <Button
              type="button"
              className="gap-2 bg-[#0d9488] hover:bg-[#0f766e]"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset draft
            </Button>
          </div>
          {saveHint && <p className="text-sm text-muted-foreground">{saveHint}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
