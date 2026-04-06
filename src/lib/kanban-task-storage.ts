import type {
  ChecklistItem,
  EngagementType,
  TaskBucket,
  TaskStatus,
} from "@/types/index";
import { getInitialSyncedTasksForProject } from "@/lib/project-task-templates";
import {
  getSyncedTasks,
  setSyncedTasks,
  upsertProjectTasks,
  type SyncedTask,
} from "@/lib/task-sync";

/**
 * Payload for mirroring a Kanban card into `dfcg-synced-tasks-v1` so project detail stays in sync.
 */
export interface KanbanTaskSyncInput {
  id: string;
  project_id: string;
  name: string;
  status: TaskStatus;
  engagement_type: string;
  assignee: string | null;
  initials: string | null;
  due_date: string | null;
  bucket: TaskBucket;
  /** When set (e.g. from Edit modal), replaces checklist on the synced row. Omit when only status/assignee/due change (e.g. drag). */
  checklist_items?: ChecklistItem[] | null;
}

function completedDateForStatus(
  status: TaskStatus,
  dueDate: string | null
): string | null {
  if (status !== "completed") return null;
  return dueDate ?? new Date().toISOString().split("T")[0];
}

/**
 * Writes a dashboard task's status (and assignee/due) into localStorage so `/projects/[id]` reflects it.
 * - If the task id already exists in sync storage, updates that row.
 * - Otherwise bootstraps the project's template (when needed) and matches by name + bucket, then name.
 */
export function applyKanbanTaskToSyncedStorage(task: KanbanTaskSyncInput): void {
  const pid = task.project_id;
  const engagement = task.engagement_type as EngagementType;
  const all = getSyncedTasks();

  const existing = all.find((t) => t.id === task.id && t.project_id === pid);
  if (existing) {
    const next = all.map((t) =>
      t.id === task.id && t.project_id === pid
        ? {
            ...t,
            status: task.status,
            assigned_to: task.assignee,
            initials: task.initials,
            due_date: task.due_date,
            completed_date: completedDateForStatus(task.status, task.due_date),
            ...(task.checklist_items !== undefined
              ? { checklist_items: task.checklist_items ?? [] }
              : {}),
          }
        : t
    );
    setSyncedTasks(next);
    return;
  }

  let projectTasks = all.filter((t) => t.project_id === pid);
  if (projectTasks.length === 0) {
    projectTasks = getInitialSyncedTasksForProject(pid, engagement);
  }

  const matchIdx = projectTasks.findIndex(
    (t) => t.name === task.name && t.bucket === task.bucket
  );
  const nameIdx =
    matchIdx !== -1
      ? matchIdx
      : projectTasks.findIndex((t) => t.name === task.name);

  if (nameIdx === -1) {
    // Mock-only card (not in template): persist as its own row so project detail can show it.
    const maxSort = Math.max(0, ...projectTasks.map((t) => t.sort_order));
    const newRow: SyncedTask = {
      id: task.id,
      project_id: pid,
      engagement_type: engagement,
      bucket: task.bucket,
      name: task.name,
      description: null,
      status: task.status,
      assigned_to: task.assignee,
      initials: task.initials,
      due_date: task.due_date,
      completed_date: completedDateForStatus(task.status, task.due_date),
      checklist_items: task.checklist_items ?? [],
      sort_order: maxSort + 1,
    };
    upsertProjectTasks(pid, [...projectTasks, newRow]);
    return;
  }

  const updatedRow: SyncedTask = {
    ...projectTasks[nameIdx],
    status: task.status,
    assigned_to: task.assignee,
    initials: task.initials,
    due_date: task.due_date,
    completed_date: completedDateForStatus(task.status, task.due_date),
    ...(task.checklist_items !== undefined
      ? { checklist_items: task.checklist_items ?? [] }
      : {}),
  };

  const nextProject = projectTasks.map((t, i) =>
    i === nameIdx ? updatedRow : t
  );
  upsertProjectTasks(pid, nextProject);
}
