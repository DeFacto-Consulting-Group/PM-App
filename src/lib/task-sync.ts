import type { ChecklistItem, EngagementType, TaskBucket, TaskStatus } from "@/types/index";

const TASK_STORE_KEY = "dfcg-synced-tasks-v1";

/** Fired on same-tab writes so the Tasks board can refresh (storage event is cross-tab only). */
export const TASK_SYNC_STORAGE_EVENT = "dfcg-synced-tasks-updated";

export interface SyncedTask {
  id: string;
  project_id: string;
  engagement_type: EngagementType;
  bucket: TaskBucket;
  name: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  initials: string | null;
  due_date: string | null;
  completed_date: string | null;
  checklist_items: ChecklistItem[];
  sort_order: number;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyTaskStorageChanged() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new CustomEvent(TASK_SYNC_STORAGE_EVENT));
}

/**
 * Broadcast that synced task data may have changed (same-tab).
 * Call after saves so dashboard widgets, Tasks board, and project detail stay aligned with localStorage.
 * `setSyncedTasks` already emits this when the stored JSON changes; use this to force a refresh when
 * you need listeners to re-read even if storage was unchanged, or to complement writes that bypass setSyncedTasks.
 */
export function emitTaskSyncUpdated() {
  notifyTaskStorageChanged();
}

export function getSyncedTasks(): SyncedTask[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(TASK_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncedTask[]) : [];
  } catch {
    return [];
  }
}

export function setSyncedTasks(tasks: SyncedTask[]) {
  if (!canUseStorage()) return;
  const next = JSON.stringify(tasks);
  const prevRaw = window.localStorage.getItem(TASK_STORE_KEY);
  const prev = prevRaw ?? "[]";
  if (prev === next) {
    return;
  }
  window.localStorage.setItem(TASK_STORE_KEY, next);
  notifyTaskStorageChanged();
}

export function upsertProjectTasks(projectId: string, tasks: SyncedTask[]) {
  const current = getSyncedTasks();
  const withoutProject = current.filter((t) => t.project_id !== projectId);
  setSyncedTasks([...withoutProject, ...tasks]);
}

export function upsertSyncedTask(task: SyncedTask) {
  const current = getSyncedTasks();
  const index = current.findIndex((t) => t.id === task.id);
  if (index === -1) {
    setSyncedTasks([...current, task]);
    return;
  }
  const next = [...current];
  next[index] = task;
  setSyncedTasks(next);
}
