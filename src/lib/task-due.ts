import type { TaskStatus } from "@/types/index";

/**
 * True when the task has a due date before today (local calendar).
 * Completed tasks are never flagged as overdue.
 */
export function isTaskPastDue(
  dueDate: string | null,
  status: TaskStatus
): boolean {
  if (status === "completed" || !dueDate) return false;
  let due: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const [y, m, d] = dueDate.split("-").map(Number);
    due = new Date(y, m - 1, d);
  } else {
    due = new Date(dueDate);
  }
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return due < startOfToday;
}
