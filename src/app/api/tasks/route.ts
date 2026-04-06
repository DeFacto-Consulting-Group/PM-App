import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ChecklistItem,
  EngagementType,
  TaskBucket,
  TaskStatus,
  UserRole,
} from "@/types/index";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

interface TaskApiRow {
  id: string;
  project_id: string;
  project_name: string;
  engagement_type: EngagementType;
  bucket: TaskBucket;
  name: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  assignee_name: string | null;
  initials: string | null;
  due_date: string | null;
  completed_date: string | null;
  checklist_items: ChecklistItem[];
  sort_order: number;
}

function toInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

async function getAuthorizedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  return { supabase, userId: user.id, role: profile.role as UserRole };
}

async function canManageProject(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  role: UserRole;
  userId: string;
  projectInternalId: string;
  /** Allow PM bootstrap: add a task assigned to themselves even if not yet assigned */
  allowSelfAssignBootstrap?: boolean;
  requestedAssignedTo?: string | null;
}): Promise<{ ok: true } | { error: NextResponse; status: number }> {
  if (args.role === "admin" || args.role === "pic") return { ok: true };
  if (args.role !== "project_manager") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), status: 403 };
  }

  if (
    args.allowSelfAssignBootstrap &&
    args.requestedAssignedTo &&
    args.requestedAssignedTo === args.userId
  ) {
    return { ok: true };
  }

  const { data, error } = await args.supabase
    .from("tasks")
    .select("id")
    .eq("project_id", args.projectInternalId)
    .eq("assigned_to", args.userId)
    .limit(1);

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 400 }), status: 400 };
  }

  if (!data || data.length === 0) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), status: 403 };
  }

  return { ok: true };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ tasks: [] as TaskApiRow[] });
  }

  const auth = await getAuthorizedClient();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const projectCode = searchParams.get("projectId");

  let projectRows:
    | Array<{
        id: string;
        project_id: string;
        name: string;
        engagement_type: EngagementType;
      }>
    | null = null;

  if (projectCode) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, project_id, name, engagement_type")
      .eq("project_id", projectCode);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    projectRows = (data ?? []) as Array<{
      id: string;
      project_id: string;
      name: string;
      engagement_type: EngagementType;
    }>;
    if (projectRows.length === 0) {
      return NextResponse.json({ tasks: [] as TaskApiRow[] });
    }
  }

  let tasksQuery = supabase
    .from("tasks")
    .select(
      "id, project_id, bucket, name, description, status, assigned_to, due_date, completed_date, checklist_items, sort_order"
    )
    .order("sort_order", { ascending: true });

  if (projectRows && projectRows.length > 0) {
    tasksQuery = tasksQuery.in(
      "project_id",
      projectRows.map((p) => p.id)
    );
  }

  const { data: tasksData, error: tasksError } = await tasksQuery;
  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 400 });
  }

  const rawTasks = (tasksData ?? []) as Array<{
    id: string;
    project_id: string;
    bucket: TaskBucket;
    name: string;
    description: string | null;
    status: TaskStatus;
    assigned_to: string | null;
    due_date: string | null;
    completed_date: string | null;
    checklist_items: ChecklistItem[];
    sort_order: number;
  }>;

  const projectIdSet = [...new Set(rawTasks.map((task) => task.project_id))];
  const projectMap = new Map<
    string,
    { project_id: string; name: string; engagement_type: EngagementType }
  >();

  if (projectRows) {
    projectRows.forEach((project) => {
      projectMap.set(project.id, {
        project_id: project.project_id,
        name: project.name,
        engagement_type: project.engagement_type,
      });
    });
  } else if (projectIdSet.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, project_id, name, engagement_type")
      .in("id", projectIdSet);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    (data ?? []).forEach((project) => {
      const row = project as {
        id: string;
        project_id: string;
        name: string;
        engagement_type: EngagementType;
      };
      projectMap.set(row.id, {
        project_id: row.project_id,
        name: row.name,
        engagement_type: row.engagement_type,
      });
    });
  }

  const assigneeIds = [
    ...new Set(rawTasks.map((task) => task.assigned_to).filter(Boolean)),
  ] as string[];
  const assigneeMap = new Map<string, { name: string; initials: string }>();

  if (assigneeIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", assigneeIds);

    if (!error) {
      (data ?? []).forEach((profile) => {
        const row = profile as { id: string; first_name: string; last_name: string };
        assigneeMap.set(row.id, {
          name: `${row.first_name} ${row.last_name}`.trim(),
          initials: toInitials(row.first_name, row.last_name),
        });
      });
    }
  }

  const tasks: TaskApiRow[] = rawTasks
    .map((task) => {
      const project = projectMap.get(task.project_id);
      if (!project) return null;
      const assignee = task.assigned_to ? assigneeMap.get(task.assigned_to) : undefined;
      return {
        id: task.id,
        project_id: project.project_id,
        project_name: project.name,
        engagement_type: project.engagement_type,
        bucket: task.bucket,
        name: task.name,
        description: task.description,
        status: task.status,
        assigned_to: task.assigned_to,
        assignee_name: assignee?.name ?? null,
        initials: assignee?.initials ?? null,
        due_date: task.due_date,
        completed_date: task.completed_date,
        checklist_items: task.checklist_items ?? [],
        sort_order: task.sort_order,
      };
    })
    .filter((task): task is TaskApiRow => task !== null);

  return NextResponse.json({ tasks });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true });
  }

  const auth = await getAuthorizedClient();
  if ("error" in auth) return auth.error;
  const { supabase, role, userId } = auth;

  const body = (await request.json()) as {
    id?: string;
    status?: TaskStatus;
    assigned_to?: string | null;
    due_date?: string | null;
    completed_date?: string | null;
    checklist_items?: ChecklistItem[];
  };

  if (!body.id) {
    return NextResponse.json({ error: "Task id is required." }, { status: 400 });
  }

  const { data: existingTask, error: existingTaskError } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", body.id)
    .single();

  if (existingTaskError || !existingTask) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const manage = await canManageProject({
    supabase,
    role,
    userId,
    projectInternalId: existingTask.project_id as string,
  });
  if ("error" in manage) return manage.error;

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.completed_date !== undefined) updates.completed_date = body.completed_date;
  if (body.checklist_items !== undefined) updates.checklist_items = body.checklist_items;

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", body.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update task." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true });
  }

  const auth = await getAuthorizedClient();
  if ("error" in auth) return auth.error;
  const { supabase, role, userId } = auth;

  const body = (await request.json()) as {
    project_id?: string; // project code, e.g. "0001-2026"
    bucket?: TaskBucket;
    name?: string;
    description?: string | null;
    status?: TaskStatus;
    assigned_to?: string | null;
    due_date?: string | null;
    completed_date?: string | null;
    checklist_items?: ChecklistItem[];
    sort_order?: number;
  };

  const projectCode = body.project_id?.trim();
  const name = body.name?.trim();
  if (!projectCode || !name || !body.bucket || !body.status) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("project_id", projectCode)
    .single();

  if (projectError || !projectRow) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const manage = await canManageProject({
    supabase,
    role,
    userId,
    projectInternalId: projectRow.id as string,
    allowSelfAssignBootstrap: true,
    requestedAssignedTo: body.assigned_to ?? null,
  });
  if ("error" in manage) return manage.error;

  const { data: inserted, error: insertError } = await supabase
    .from("tasks")
    .insert({
      project_id: projectRow.id,
      bucket: body.bucket,
      name,
      description: body.description ?? null,
      status: body.status,
      assigned_to: body.assigned_to ?? null,
      due_date: body.due_date ?? null,
      completed_date: body.completed_date ?? null,
      checklist_items: body.checklist_items ?? [],
      sort_order: body.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create task." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, id: inserted.id });
}
