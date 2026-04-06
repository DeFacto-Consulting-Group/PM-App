"use client";

import Link from "next/link";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskStatus } from "@/types/index";
import { TASK_STATUS_LABELS } from "@/types/index";
import { applyKanbanTaskToSyncedStorage } from "@/lib/kanban-task-storage";
import { emitTaskSyncUpdated } from "@/lib/task-sync";
import type { KanbanTask } from "@/lib/kanban-task";

const teamMembers = [
  { value: "Tim Reynolds", initials: "TR" },
  { value: "John Harrison", initials: "JH" },
  { value: "Sarah Chen", initials: "SC" },
  { value: "Michael Torres", initials: "MT" },
  { value: "Emily Walsh", initials: "EW" },
  { value: "Robert Kim", initials: "RK" },
];

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

export interface TaskEditDialogProps {
  editingTask: KanbanTask | null;
  onEditingTaskChange: Dispatch<SetStateAction<KanbanTask | null>>;
  /** Called after a successful save (sync + optional API). */
  onSaveSuccess?: () => void;
  /** Subtitle under the dialog title */
  contextLabel?: string;
}

export function TaskEditDialog({
  editingTask,
  onEditingTaskChange,
  onSaveSuccess,
  contextLabel = "Update status, assignee, due date, and subtasks from the Tasks dashboard.",
}: TaskEditDialogProps) {
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  return (
    <Dialog
      open={!!editingTask}
      onOpenChange={(open) => {
        if (!open) {
          onEditingTaskChange(null);
          setTaskError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>{contextLabel}</DialogDescription>
          {editingTask && (
            <>
              <p className="pt-1 text-sm font-medium text-foreground">{editingTask.name}</p>
              <p className="text-xs text-muted-foreground">
                {editingTask.project_name}{" "}
                <Link
                  href={`/projects/${editingTask.project_id}`}
                  className="text-[rgb(73,148,208)] hover:text-[rgb(58,127,182)] hover:underline"
                >
                  {editingTask.project_id}
                </Link>
              </p>
            </>
          )}
        </DialogHeader>
        {editingTask && (
          <div className="space-y-4">
            {taskError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {taskError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editingTask.status}
                onValueChange={(v) =>
                  onEditingTaskChange((prev) =>
                    prev ? { ...prev, status: (v ?? prev.status) as TaskStatus } : prev
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{TASK_STATUS_LABELS[editingTask.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select
                value={editingTask.assignee ?? "__unassigned__"}
                onValueChange={(v) =>
                  onEditingTaskChange((prev) =>
                    prev
                      ? {
                          ...prev,
                          assignee: v === "__unassigned__" ? null : (v ?? null),
                          assignee_id: null,
                        }
                      : prev
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned">
                    {editingTask.assignee ?? "Unassigned"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editingTask.due_date ?? ""}
                onChange={(e) =>
                  onEditingTaskChange((prev) =>
                    prev ? { ...prev, due_date: e.target.value || null } : prev
                  )
                }
              />
            </div>

            {editingTask.checklist_items.length > 0 && (
              <div className="space-y-2">
                <Label>Subtasks</Label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                  {editingTask.checklist_items.map((item, idx) => (
                    <label
                      key={`${item.name}-${idx}`}
                      className="flex cursor-pointer items-start gap-2.5 text-sm"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={item.completed}
                        onCheckedChange={() =>
                          onEditingTaskChange((prev) => {
                            if (!prev) return prev;
                            const nextItems = [...prev.checklist_items];
                            nextItems[idx] = {
                              ...nextItems[idx],
                              completed: !nextItems[idx].completed,
                            };
                            const checklist_done = nextItems.filter((i) => i.completed).length;
                            return {
                              ...prev,
                              checklist_items: nextItems,
                              checklist_done,
                              checklist_total: nextItems.length,
                            };
                          })
                        }
                      />
                      <span
                        className={
                          item.completed ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {item.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSavingTask}
            onClick={() => {
              onEditingTaskChange(null);
              setTaskError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSavingTask}
            onClick={async () => {
              if (!editingTask) return;
              setTaskError(null);
              setIsSavingTask(true);
              const updatedTask: KanbanTask = {
                ...editingTask,
                initials:
                  teamMembers.find((m) => m.value === editingTask.assignee)?.initials ??
                  editingTask.initials,
              };

              applyKanbanTaskToSyncedStorage({
                id: updatedTask.id,
                project_id: updatedTask.project_id,
                name: updatedTask.name,
                status: updatedTask.status,
                engagement_type: updatedTask.engagement_type,
                assignee: updatedTask.assignee,
                initials: updatedTask.initials,
                due_date: updatedTask.due_date,
                bucket: updatedTask.bucket,
                checklist_items: updatedTask.checklist_items,
              });

              if (isSupabaseConfigured && UUID_REGEX.test(updatedTask.id)) {
                const response = await fetch("/api/tasks", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: updatedTask.id,
                    status: updatedTask.status,
                    assigned_to: updatedTask.assignee_id ?? null,
                    due_date: updatedTask.due_date,
                    completed_date:
                      updatedTask.status === "completed"
                        ? updatedTask.due_date ?? new Date().toISOString().split("T")[0]
                        : null,
                    checklist_items: updatedTask.checklist_items,
                  }),
                });
                if (!response.ok) {
                  const result = (await response.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  setTaskError(result.error ?? "Failed to save task.");
                  setIsSavingTask(false);
                  return;
                }
              }

              emitTaskSyncUpdated();
              setIsSavingTask(false);
              onEditingTaskChange(null);
              onSaveSuccess?.();
            }}
          >
            {isSavingTask ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
