import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getDefaultWorkflowDraft, type ProjectStatusWorkflowDraft } from "@/lib/project-status-workflow";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

const TEMPLATE_KEY = "project_status_workflow";

async function requireAdminOrPic(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false as const, status: 404, error: "Profile not found." };
  if (!["admin", "pic"].includes(profile.role as string)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, userId: user.id as string };
}

function isDraftLike(value: unknown): value is ProjectStatusWorkflowDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.deliveryPipeline)) return false;
  if (typeof v.conflictLabelOverrides !== "object" || v.conflictLabelOverrides === null) return false;
  if (typeof v.notes !== "string") return false;
  return true;
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ draft: getDefaultWorkflowDraft(), source: "default" });
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireAdminOrPic(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data } = await supabase
    .from("workflow_templates")
    .select("draft, updated_at, updated_by")
    .eq("key", TEMPLATE_KEY)
    .maybeSingle();

  const draft = data?.draft;
  if (!isDraftLike(draft)) {
    return NextResponse.json({ draft: getDefaultWorkflowDraft(), source: "default" });
  }

  return NextResponse.json({
    draft,
    source: "supabase",
    updated_at: data?.updated_at ?? null,
    updated_by: data?.updated_by ?? null,
  });
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured for this environment." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireAdminOrPic(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as { draft?: unknown } | null;
  if (!body?.draft || !isDraftLike(body.draft)) {
    return NextResponse.json({ error: "Invalid draft payload." }, { status: 400 });
  }

  const draft = body.draft as ProjectStatusWorkflowDraft;

  const { error } = await supabase.from("workflow_templates").upsert(
    {
      key: TEMPLATE_KEY,
      draft,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

