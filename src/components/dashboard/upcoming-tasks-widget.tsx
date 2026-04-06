"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSyncedTasks, TASK_SYNC_STORAGE_EVENT, type SyncedTask } from "@/lib/task-sync";
import { demoProjectLabel } from "@/lib/demo-project-labels";
import { cn } from "@/lib/utils";

/** Monday of the week containing `d` (local time). */
function getMonday(d: Date): Date {
  const c = new Date(d);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseDueDate(iso: string): Date {
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Open tasks with a due date in [this week Monday, next week Friday] (inclusive). */
function loadTasksInTwoWeekWindow(): SyncedTask[] {
  const now = new Date();
  const mon = getMonday(now);
  const week2Fri = addDays(addDays(mon, 7), 4);
  week2Fri.setHours(23, 59, 59, 999);

  return getSyncedTasks().filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    const due = parseDueDate(t.due_date);
    const w = due.getDay();
    if (w === 0 || w === 6) return false;
    return due >= mon && due <= week2Fri;
  });
}

function WeekColumn({
  day,
  tasks,
}: {
  day: Date;
  tasks: SyncedTask[];
}) {
  return (
    <div className="flex min-h-[130px] flex-col rounded-lg border bg-muted/30 p-2.5">
      <div className="border-b border-border/60 pb-2">
        <p className="text-xs font-semibold leading-tight">
          {formatDayLabel(day)}
        </p>
        <p className="text-[10px] text-muted-foreground">{formatMonthDay(day)}</p>
      </div>
      <ul className="mt-2 flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? (
          <li className="text-[10px] text-muted-foreground">—</li>
        ) : (
          tasks.map((t) => (
            <li key={`${t.project_id}-${t.id}`} className="min-w-0">
              <Link
                href={`/projects/${t.project_id}`}
                className="line-clamp-2 text-xs font-medium text-[#0d9488] hover:underline"
              >
                {t.name}
              </Link>
              <p className="truncate text-[10px] text-muted-foreground">
                {demoProjectLabel(t.project_id)} · {t.project_id}
              </p>
              {t.assigned_to && (
                <p className="text-[10px] text-muted-foreground">{t.assigned_to}</p>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function WeekGrid({
  days,
  tasksByDate,
}: {
  days: Date[];
  tasksByDate: Map<string, SyncedTask[]>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayTasks = tasksByDate.get(key) ?? [];
        return <WeekColumn key={key} day={day} tasks={dayTasks} />;
      })}
    </div>
  );
}

export function UpcomingTasksWidget({
  layout = "calendar",
}: {
  layout?: "calendar" | "vertical";
}) {
  const [tasks, setTasks] = useState<SyncedTask[]>([]);
  const [activeWeek, setActiveWeek] = useState<"this" | "next">("this");

  const refresh = useCallback(() => {
    setTasks(loadTasksInTwoWeekWindow());
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

  const { thisWeekDays, nextWeekDays, tasksByDate } = useMemo(() => {
    const now = new Date();
    const mon = getMonday(now);
    const thisWeek = [0, 1, 2, 3, 4].map((i) => addDays(mon, i));
    const nextMon = addDays(mon, 7);
    const nextWeek = [0, 1, 2, 3, 4].map((i) => addDays(nextMon, i));

    const map = new Map<string, SyncedTask[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }

    return { thisWeekDays: thisWeek, nextWeekDays: nextWeek, tasksByDate: map };
  }, [tasks]);

  const activeWeekDays = activeWeek === "this" ? thisWeekDays : nextWeekDays;
  return (
    <Card className={layout === "vertical" ? "flex h-full flex-col" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-[#0d9488]" />
          Upcoming tasks
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn("space-y-4", layout === "vertical" && "min-h-0 flex-1")}
      >
        <div
          className="inline-flex w-full max-w-md rounded-lg border border-[#102a43]/20 bg-[#102a43]/8 p-1 sm:w-auto"
          role="tablist"
          aria-label="Choose week"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeWeek === "this"}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              activeWeek === "this"
                ? "bg-[#1f3b64] text-white shadow-sm"
                : "text-[#102a43]/70 hover:bg-[#1f3b64]/15 hover:text-[#102a43]"
            )}
            onClick={() => setActiveWeek("this")}
          >
            This week
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeWeek === "next"}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              activeWeek === "next"
                ? "bg-[#1f3b64] text-white shadow-sm"
                : "text-[#102a43]/70 hover:bg-[#1f3b64]/15 hover:text-[#102a43]"
            )}
            onClick={() => setActiveWeek("next")}
          >
            Next week
          </button>
        </div>

        {layout === "vertical" ? (
          <>
            <div className="space-y-3">
              {activeWeekDays.map((day) => {
                const key = toDateKey(day);
                const dayTasks = tasksByDate.get(key) ?? [];
                return (
                  <section key={key} className="rounded-lg border bg-muted/20 p-2.5">
                    <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-border/60 pb-1.5">
                      <p className="text-sm font-semibold leading-tight">
                        {formatDayLabel(day)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMonthDay(day)}
                      </p>
                    </div>
                    {dayTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tasks</p>
                    ) : (
                      <ul className="space-y-2">
                        {dayTasks.map((t) => (
                          <li
                            key={`${key}-${t.project_id}-${t.id}`}
                            className="rounded-md border bg-background p-2"
                          >
                            <Link
                              href={`/projects/${t.project_id}`}
                              className="line-clamp-2 text-sm font-medium text-[#0d9488] hover:underline"
                            >
                              {t.name}
                            </Link>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>{demoProjectLabel(t.project_id)}</span>
                              <span>
                                {t.due_date
                                  ? formatMonthDay(parseDueDate(t.due_date))
                                  : "No due date"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {activeWeek === "this" ? (
              <WeekGrid days={thisWeekDays} tasksByDate={tasksByDate} />
            ) : (
              <WeekGrid days={nextWeekDays} tasksByDate={tasksByDate} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
