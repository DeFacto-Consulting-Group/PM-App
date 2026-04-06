import type { ChecklistItem, EngagementType, TaskBucket, TaskStatus } from "@/types/index";
import { getSyncedTasks, type SyncedTask } from "@/lib/task-sync";
import { getInitialSyncedTasksForProject } from "@/lib/project-task-templates";

/** Board / edit shape for a task (Tasks dashboard + edit dialog). */
export interface KanbanTask {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  bucket: TaskBucket;
  assignee: string | null;
  assignee_id?: string | null;
  initials: string | null;
  due_date: string | null;
  status: TaskStatus;
  engagement_type: string;
  checklist_total: number;
  checklist_done: number;
  checklist_items: ChecklistItem[];
}

/** Mock / fallback project titles — matches project detail mocks. */
export const PROJECT_DISPLAY_NAMES: Record<string, string> = {
  "0001-2026": "Riverside Office Complex Appraisal",
  "0002-2026": "Palomita Blanca v. Covington Ins.",
  "0003-2026": "Metro Plaza Cost Estimate",
  "0004-2026": "Lakeside Tower PCA",
  "0005-2026": "Downtown Retail ADR",
};

export function projectDisplayName(projectId: string, fallback?: string | null): string {
  if (fallback?.trim()) return fallback.trim();
  return PROJECT_DISPLAY_NAMES[projectId] ?? projectId;
}

export function toKanbanTask(task: SyncedTask): KanbanTask {
  const items = task.checklist_items ?? [];
  const checklistTotal = items.length;
  const checklistDone = items.filter((item) => item.completed).length;
  return {
    id: task.id,
    name: task.name,
    project_id: task.project_id,
    project_name: projectDisplayName(task.project_id),
    bucket: task.bucket,
    assignee: task.assigned_to,
    initials: task.initials,
    due_date: task.due_date,
    status: task.status,
    engagement_type: task.engagement_type,
    checklist_items: items.map((i) => ({ ...i })),
    checklist_total: checklistTotal,
    checklist_done: checklistDone,
  };
}

function applyChecklistToTask(task: KanbanTask, items: ChecklistItem[]): KanbanTask {
  const checklist_done = items.filter((i) => i.completed).length;
  return {
    ...task,
    checklist_items: items.map((i) => ({ ...i })),
    checklist_total: items.length,
    checklist_done,
  };
}

/** Load subtasks from synced storage or engagement template when the row only has counts. */
export function hydrateTaskForEdit(task: KanbanTask): KanbanTask {
  if (task.checklist_items.length > 0) {
    return task;
  }
  const synced = getSyncedTasks().find(
    (t) => t.id === task.id && t.project_id === task.project_id
  );
  if (synced?.checklist_items?.length) {
    return applyChecklistToTask(task, synced.checklist_items);
  }
  const engagement = task.engagement_type as EngagementType;
  const template = getInitialSyncedTasksForProject(task.project_id, engagement);
  const match =
    template.find((t) => t.name === task.name && t.bucket === task.bucket) ??
    template.find((t) => t.name === task.name);
  if (match?.checklist_items?.length) {
    return applyChecklistToTask(task, match.checklist_items);
  }
  return task;
}
