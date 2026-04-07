"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ProjectStatus } from "@/types/index";
import { UpcomingTasksWidget } from "@/components/dashboard/upcoming-tasks-widget";
import { OverdueTasksWidget } from "@/components/dashboard/overdue-tasks-widget";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/types/index";
import { mockProjects } from "@/lib/mock-projects";
import { setSyncedTasks, type SyncedTask } from "@/lib/task-sync";
import type { TaskBucket, TaskStatus } from "@/types/index";

const statusOrder: ProjectStatus[] = [
  "active",
  "pending_conflict",
  "conflict_review",
  "pending_ea_retainer_auth",
  "report_issued",
  "hold",
  "closed",
];

const statusBreakdown: { status: ProjectStatus; count: number }[] = statusOrder.map(
  (status) => ({
    status,
    count: mockProjects.filter((p) => p.status === status).length,
  })
);

const maxStatusCount = Math.max(...statusBreakdown.map((s) => s.count));
const pendingConflictCount =
  statusBreakdown.find((s) => s.status === "pending_conflict")?.count ?? 0;
const conflictReviewCount =
  statusBreakdown.find((s) => s.status === "conflict_review")?.count ?? 0;
const pendingEaCount =
  statusBreakdown.find((s) => s.status === "pending_ea_retainer_auth")?.count ??
  0;

const stats = [
  {
    label: "Pending Conflict Check",
    value: pendingConflictCount,
    icon: AlertTriangle,
    href: "/projects?status=pending_conflict",
  },
  {
    label: "Review Possible Conflict",
    value: conflictReviewCount,
    icon: AlertTriangle,
    href: "/projects?status=conflict_review",
  },
  {
    label: "Pending EA/Retainer",
    value: pendingEaCount,
    icon: AlertTriangle,
    href: "/projects?status=pending_ea_retainer_auth",
  },
].filter((stat) => stat.value > 0);

export default function DashboardPage() {
  const upcomingCardRef = useRef<HTMLDivElement | null>(null);
  const [upcomingCardHeight, setUpcomingCardHeight] = useState<number | null>(null);

  useEffect(() => {
    // In Supabase mode, populate dashboard widgets from DB-backed tasks.
    // Widgets read from localStorage via `getSyncedTasks()`, which is empty on first load otherwise.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) return;

    const sync = async () => {
      const res = await fetch("/api/tasks");
        const result = (await res.json().catch(() => ({}))) as {
          tasks?: Array<{
            id: string;
            project_id: string;
            engagement_type: SyncedTask["engagement_type"];
            bucket: TaskBucket;
            name: string;
            description: string | null;
            status: TaskStatus;
            assigned_to: string | null;
            initials: string | null;
            due_date: string | null;
            completed_date: string | null;
            checklist_items: SyncedTask["checklist_items"];
            sort_order: number;
          }>;
        };
      if (!res.ok || !result.tasks) return;
      if (result.tasks.length === 0) {
        // First-run bootstrap: if DB has zero tasks, create them from templates.
        await fetch("/api/tasks/bootstrap", { method: "POST" }).catch(() => {});
        // Then re-fetch and sync.
        const res2 = await fetch("/api/tasks");
        const result2 = (await res2.json().catch(() => ({}))) as { tasks?: typeof result.tasks };
        if (!res2.ok || !result2.tasks) return;
        setSyncedTasks(
          result2.tasks.map(
            (t): SyncedTask => ({
              id: t.id,
              project_id: t.project_id,
              engagement_type: t.engagement_type,
              bucket: t.bucket,
              name: t.name,
              description: t.description ?? null,
              status: t.status,
              assigned_to: t.assigned_to ?? null,
              initials: t.initials ?? null,
              due_date: t.due_date ?? null,
              completed_date: t.completed_date ?? null,
              checklist_items: t.checklist_items ?? [],
              sort_order: t.sort_order ?? 0,
            })
          )
        );
        return;
      }
      setSyncedTasks(
        result.tasks.map(
          (t): SyncedTask => ({
            id: t.id,
            project_id: t.project_id,
            engagement_type: t.engagement_type,
            bucket: t.bucket,
            name: t.name,
            description: t.description ?? null,
            status: t.status,
            assigned_to: t.assigned_to ?? null,
            initials: t.initials ?? null,
            due_date: t.due_date ?? null,
            completed_date: t.completed_date ?? null,
            checklist_items: t.checklist_items ?? [],
            sort_order: t.sort_order ?? 0,
          })
        )
      );
    };

    void sync().catch(() => {
        // Non-fatal: dashboard will just show empty widgets.
    });
  }, []);

  useEffect(() => {
    const el = upcomingCardRef.current;
    if (!el) return;

    const syncHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      setUpcomingCardHeight(h > 0 ? h : null);
    };

    syncHeight();
    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Firm-wide project overview</p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(stats.length, 1)}, minmax(0, 1fr))` }}
      >
        {stats.map((stat) => (
          stat.href ? (
            <Link key={stat.label} href={stat.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                    <stat.icon className="h-5 w-5 text-[#0d9488]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <stat.icon className="h-5 w-5 text-[#0d9488]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <div
          className="min-h-0"
          style={
            upcomingCardHeight
              ? { height: `${upcomingCardHeight}px` }
              : undefined
          }
        >
          <OverdueTasksWidget />
        </div>
        <div ref={upcomingCardRef} className="min-h-0">
          <UpcomingTasksWidget layout="vertical" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Status</CardTitle>
          <CardDescription>Distribution across all projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusBreakdown.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-muted-foreground">
                {PROJECT_STATUS_LABELS[status]}
              </span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      PROJECT_STATUS_COLORS[status]
                        .split(" ")
                        .find((c) => c.startsWith("bg-")) ?? "bg-teal-500"
                    }`}
                    style={{
                      width: `${(count / maxStatusCount) * 100}%`,
                      minWidth: "1.5rem",
                    }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-sm font-medium">
                {count}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
