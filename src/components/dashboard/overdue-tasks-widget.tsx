"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSyncedTasks, TASK_SYNC_STORAGE_EVENT, type SyncedTask } from "@/lib/task-sync";
import { demoProjectLabel } from "@/lib/demo-project-labels";
import { type KanbanTask, toKanbanTask, hydrateTaskForEdit } from "@/lib/kanban-task";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";

function parseDueDate(iso: string): Date {
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Project ID first, then display name (ID only when no demo label exists). */
function overdueProjectSubtitle(projectId: string): string {
  const name = demoProjectLabel(projectId);
  return name !== projectId ? `${projectId} · ${name}` : projectId;
}

/** Open tasks whose due date is strictly before today (local). */
function loadOverdueTasks(): SyncedTask[] {
  const today = startOfToday();
  return getSyncedTasks()
    .filter((t) => {
      if (!t.due_date || t.status === "completed") return false;
      const due = parseDueDate(t.due_date);
      return due < today;
    })
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
}

export function OverdueTasksWidget() {
  const [tasks, setTasks] = useState<SyncedTask[]>([]);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);

  const refresh = useCallback(() => {
    setTasks(loadOverdueTasks());
  }, []);

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener("storage", onSync);
    window.addEventListener(TASK_SYNC_STORAGE_EVENT, onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener(TASK_SYNC_STORAGE_EVENT, onSync);
    };
  }, [refresh]);

  return (
    <>
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-500" />
            Overdue Tasks
          </CardTitle>
          {tasks.length > 0 && (
            <Badge variant="destructive" className="font-normal">
              {tasks.length}
            </Badge>
          )}
        </div>
        <CardDescription>Open tasks past their due date (scroll if the list is long)</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
        {/* Scroll region: shows every overdue task without growing the card forever */}
        <div
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1"
          role="list"
          aria-label="Overdue tasks list"
        >
          {tasks.map((task) => (
            <div
              key={`${task.project_id}-${task.id}`}
              role="listitem"
              className="flex items-start justify-between gap-3 rounded-lg border border-red-200/80 bg-red-50/40 p-3 dark:border-red-900/50 dark:bg-red-950/20"
            >
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditingTask(hydrateTaskForEdit(toKanbanTask(task)))
                  }
                  className="cursor-pointer text-left text-sm font-medium text-[#0d9488] hover:underline"
                >
                  {task.name}
                </button>
                <p className="truncate text-xs text-muted-foreground">
                  {overdueProjectSubtitle(task.project_id)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                Due {task.due_date?.slice(0, 10)}
              </span>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No overdue tasks. Manage due dates on the{" "}
            <Link href="/tasks" className="font-medium text-[#0d9488] hover:underline">
              Tasks
            </Link>{" "}
            board.
          </p>
        )}

        {tasks.length > 0 && (
          <p className="shrink-0 border-t pt-2 text-xs text-muted-foreground">
            <Link href="/tasks" className="font-medium text-[#0d9488] hover:underline">
              Open Tasks board
            </Link>{" "}
            to update or complete items.
          </p>
        )}
      </CardContent>
    </Card>

    <TaskEditDialog
      editingTask={editingTask}
      onEditingTaskChange={setEditingTask}
      onSaveSuccess={refresh}
      contextLabel="Update status, assignee, due date, and subtasks."
    />
    </>
  );
}
