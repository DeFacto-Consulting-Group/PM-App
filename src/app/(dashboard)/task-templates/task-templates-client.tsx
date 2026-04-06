"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChecklistItem } from "@/types/index";
import { TASK_BUCKET_LABELS, TASK_BUCKET_ORDER, type TaskBucket } from "@/types/index";
import type { MockTask } from "@/lib/project-task-templates";
import {
  clearTemplateOverride,
  getEffectiveTemplateTasks,
  saveTemplateOverride,
  TASK_TEMPLATE_OVERRIDES_EVENT,
  TASK_TEMPLATE_REGISTRY,
  type TemplateGroupId,
} from "@/lib/project-task-templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ClipboardList, RotateCcw, Save } from "lucide-react";

function checklistToLines(items: ChecklistItem[]): string {
  return items.map((c) => c.name).join("\n");
}

function linesToChecklist(text: string): ChecklistItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name, completed: false }));
}

function cloneTasks(tasks: MockTask[]): MockTask[] {
  return JSON.parse(JSON.stringify(tasks)) as MockTask[];
}

export function TaskTemplatesClient() {
  const [activeGroup, setActiveGroup] = useState<TemplateGroupId>("general");
  const [tasks, setTasks] = useState<MockTask[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setTasks(cloneTasks(getEffectiveTemplateTasks(activeGroup)));
    setSaveMessage(null);
  }, [activeGroup]);

  useEffect(() => {
    const onOverride = () => {
      setTasks(cloneTasks(getEffectiveTemplateTasks(activeGroup)));
    };
    window.addEventListener(TASK_TEMPLATE_OVERRIDES_EVENT, onOverride);
    return () => window.removeEventListener(TASK_TEMPLATE_OVERRIDES_EVENT, onOverride);
  }, [activeGroup]);

  const byBucket = useMemo(() => {
    const map = new Map<TaskBucket, MockTask[]>();
    for (const b of TASK_BUCKET_ORDER) map.set(b, []);
    for (const t of tasks) {
      if (!map.has(t.bucket)) map.set(t.bucket, []);
      map.get(t.bucket)!.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [tasks]);

  const updateTask = useCallback((id: string, patch: Partial<MockTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSaveMessage(null);
  }, []);

  const handleSave = () => {
    saveTemplateOverride(activeGroup, tasks);
    setSaveMessage("Saved. New projects will use this template.");
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "Reset this template to the default shipped checklist? Your customizations will be removed in this browser."
      )
    ) {
      return;
    }
    clearTemplateOverride(activeGroup);
    setTasks(cloneTasks(getEffectiveTemplateTasks(activeGroup)));
    setSaveMessage("Reset to default.");
  };

  const meta = TASK_TEMPLATE_REGISTRY.find((t) => t.id === activeGroup);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Task templates</h1>
        <p className="text-muted-foreground">
          Edit master checklists used when new projects are created. Changes apply to this browser; add more
          template types here as the product grows.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#0d9488]" />
            Engagement templates
          </CardTitle>
          <CardDescription>
            {meta?.description ?? "Select a template to view and edit tasks grouped by workflow stage."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="inline-flex w-full max-w-xl flex-wrap gap-1 rounded-lg border border-[#102a43]/20 bg-[#102a43]/8 p-1"
            role="tablist"
            aria-label="Template type"
          >
            {TASK_TEMPLATE_REGISTRY.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeGroup === t.id}
                className={cn(
                  "flex-1 rounded-md px-4 py-2 text-left text-sm font-medium transition-colors sm:min-w-[10rem]",
                  activeGroup === t.id
                    ? "bg-[#1f3b64] text-white shadow-sm"
                    : "text-[#102a43]/70 hover:bg-[#1f3b64]/15 hover:text-[#102a43]"
                )}
                onClick={() => setActiveGroup(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave} className="gap-2 bg-[#0d9488] hover:bg-[#0f766e]">
              <Save className="h-4 w-4" />
              Save changes
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to default
            </Button>
            {saveMessage && <span className="text-sm text-muted-foreground">{saveMessage}</span>}
          </div>

          <div className="space-y-8">
            {TASK_BUCKET_ORDER.map((bucket) => {
              const bucketTasks = byBucket.get(bucket) ?? [];
              if (bucketTasks.length === 0) return null;
              return (
                <section key={bucket} className="space-y-3">
                  <h2 className="border-b pb-2 text-lg font-semibold text-[#102a43]">
                    {TASK_BUCKET_LABELS[bucket]}
                  </h2>
                  <div className="space-y-4">
                    {bucketTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border bg-card p-4 shadow-sm ring-1 ring-foreground/5"
                      >
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                          <div className="space-y-2">
                            <div>
                              <Label htmlFor={`${task.id}-name`} className="text-xs text-muted-foreground">
                                Task name
                              </Label>
                              <Input
                                id={`${task.id}-name`}
                                value={task.name}
                                onChange={(e) => updateTask(task.id, { name: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${task.id}-desc`} className="text-xs text-muted-foreground">
                                Description / SLA note
                              </Label>
                              <Input
                                id={`${task.id}-desc`}
                                value={task.description ?? ""}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    description: e.target.value === "" ? null : e.target.value,
                                  })
                                }
                                className="mt-1"
                                placeholder="Optional"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${task.id}-check`} className="text-xs text-muted-foreground">
                                Subtasks (one per line)
                              </Label>
                              <Textarea
                                id={`${task.id}-check`}
                                value={checklistToLines(task.checklist_items)}
                                onChange={(e) =>
                                  updateTask(task.id, { checklist_items: linesToChecklist(e.target.value) })
                                }
                                rows={4}
                                className="mt-1 font-mono text-xs"
                                placeholder="One checklist line per row"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground sm:text-right">
                            ID: {task.id}
                            <br />
                            Sort: {task.sort_order}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
