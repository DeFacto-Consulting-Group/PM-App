import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type { EngagementType, TaskBucket, TaskStatus, UserRole } from "@/types/index";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

function checklistTextArrayToJson(items: string[]) {
  return items.map((name) => ({ name, completed: false }));
}

export async function POST() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured for this environment." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const role = profile.role as UserRole;
  if (role !== "admin" && role !== "pic") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load all projects (needs projects_select policy; you have it).
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, project_id, engagement_type");

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 400 });
  }

  const projRows = (projects ?? []) as Array<{
    id: string;
    project_id: string;
    engagement_type: EngagementType;
  }>;

  if (projRows.length === 0) {
    return NextResponse.json({ ok: true, created: 0, projects: 0 });
  }

  // Load task templates (needs task_templates_select policy; you have it).
  const { data: templates, error: templatesError } = await supabase
    .from("task_templates")
    .select(
      "id, template_group, bucket, task_name, description, checklist_items, default_status, sort_order"
    );

  if (templatesError) {
    return NextResponse.json({ error: templatesError.message }, { status: 400 });
  }

  const tmplRows = (templates ?? []) as Array<{
    id: string;
    template_group: "appraisal" | "general";
    bucket: TaskBucket;
    task_name: string;
    description: string | null;
    checklist_items: string[];
    default_status: TaskStatus;
    sort_order: number;
  }>;

  const toGroup = (engagement: EngagementType): "appraisal" | "general" =>
    engagement === "appraisal" ? "appraisal" : "general";

  // Determine which projects already have any tasks.
  const { data: existingTasks, error: existingTasksError } = await supabase
    .from("tasks")
    .select("project_id")
    .in(
      "project_id",
      projRows.map((p) => p.id)
    );

  if (existingTasksError) {
    return NextResponse.json({ error: existingTasksError.message }, { status: 400 });
  }

  const already = new Set((existingTasks ?? []).map((t) => (t as { project_id: string }).project_id));
  const targets = projRows.filter((p) => !already.has(p.id));

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, created: 0, projects: projRows.length });
  }

  const inserts: Array<Record<string, unknown>> = [];
  for (const p of targets) {
    const group = toGroup(p.engagement_type);
    const groupTemplates = tmplRows
      .filter((t) => t.template_group === group)
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const t of groupTemplates) {
      inserts.push({
        project_id: p.id, // internal uuid FK
        template_id: t.id,
        bucket: t.bucket,
        name: t.task_name,
        description: t.description,
        status: t.default_status,
        sort_order: t.sort_order,
        checklist_items: checklistTextArrayToJson(t.checklist_items ?? []),
      });
    }
  }

  // Insert in batches to avoid payload limits.
  const BATCH = 500;
  let created = 0;
  for (let i = 0; i < inserts.length; i += BATCH) {
    const batch = inserts.slice(i, i + BATCH);
    const { error } = await supabase.from("tasks").insert(batch);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    created += batch.length;
  }

  return NextResponse.json({
    ok: true,
    created,
    projects: projRows.length,
    bootstrappedProjects: targets.length,
  });
}

