import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function parseDueDate(iso: string): Date {
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [{ count: projectCount }, { count: templateCount }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("task_templates").select("id", { count: "exact", head: true }),
  ]).then((results) =>
    results.map((r) => ({ count: r.count ?? 0 }))
  );

  const { data: rows, error } = await supabase
    .from("tasks")
    .select("id, due_date, status")
    .limit(5000);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const tasks = (rows ?? []) as Array<{
    id: string;
    due_date: string | null;
    status: string;
  }>;

  const today = startOfToday();
  const withDue = tasks.filter((t) => !!t.due_date);
  const openWithDue = withDue.filter((t) => t.status !== "completed");
  const overdue = openWithDue.filter((t) => parseDueDate(t.due_date!) < today);

  let diagnosis: string | null = null;
  if (projectCount === 0 && templateCount > 0) {
    diagnosis =
      "The projects table has no rows. Task bootstrap copies templates onto each project; with zero projects, zero tasks are created. The Projects page may still list sample data from the app (mock-projects); that is not stored in Supabase until you create or import projects.";
  } else if (projectCount === 0 && templateCount === 0) {
    diagnosis =
      "No projects and no task templates. Seed task_templates and add project rows before tasks can appear.";
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    projectCount,
    taskTemplateCount: templateCount,
    totalTasks: tasks.length,
    tasksWithDueDate: withDue.length,
    openTasksWithDueDate: openWithDue.length,
    overdueOpenTasks: overdue.length,
    ...(diagnosis ? { diagnosis } : {}),
  });
}

