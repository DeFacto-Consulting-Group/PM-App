import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ClientType,
  OtherParty,
  PerilType,
  StructureType,
  UserRole,
} from "@/types/index";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

interface UpdateProjectPayload {
  project_id: string;

  client_name?: string;
  client_type?: ClientType;
  client_address?: string;
  point_of_contact?: string | null;
  point_of_contact_secondary?: string | null;
  notes?: string | null;
  peril?: PerilType | null;
  structure_type?: StructureType | null;

  // Existing "opposing parties" functionality already uses a text[] column.
  opposing_parties?: string[];
  represented_by?: string | null;

  policy_number?: string | null;
  cause_number?: string | null;
  claim_number?: string | null;

  // New "other parties" functionality stored as jsonb array.
  other_parties?: OtherParty[];
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured for this environment. Configure Supabase to update projects.",
      },
      { status: 400 }
    );
  }

  const body = (await request.json()) as UpdateProjectPayload;
  if (!body?.project_id) {
    return NextResponse.json({ error: "Missing project_id." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse the same role gate as project creation.
  const { data: ownerProfile, error: ownerProfileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (ownerProfileError || !ownerProfile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const role = ownerProfile.role as UserRole;

  if (!["admin", "pic", "project_manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "project_manager") {
    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("project_id", body.project_id)
      .single();

    if (projectError || !projectRow) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("tasks")
      .select("id")
      .eq("project_id", projectRow.id)
      .eq("assigned_to", user.id)
      .limit(1);

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 400 });
    }

    if (!assignment || assignment.length === 0) {
      return NextResponse.json(
        { error: "Project Managers can only edit projects they are assigned to." },
        { status: 403 }
      );
    }
  }

  const updateFields: Record<string, unknown> = {};

  if (body.client_name !== undefined) {
    updateFields.client_name = body.client_name.trim();
  }
  if (body.client_type !== undefined) {
    updateFields.client_type = body.client_type;
  }
  if (body.client_address !== undefined) {
    updateFields.client_address = body.client_address?.trim() ?? "";
  }
  if (body.point_of_contact !== undefined) {
    updateFields.point_of_contact = body.point_of_contact?.trim() || null;
  }
  if (body.point_of_contact_secondary !== undefined) {
    updateFields.point_of_contact_secondary = body.point_of_contact_secondary?.trim() || null;
  }
  if (body.notes !== undefined) {
    updateFields.notes = body.notes?.trim() || null;
  }
  if (body.peril !== undefined) {
    updateFields.peril = body.peril || null;
  }
  if (body.structure_type !== undefined) {
    updateFields.structure_type = body.structure_type || null;
  }

  if (body.opposing_parties !== undefined) {
    updateFields.opposing_parties = body.opposing_parties ?? [];
  }
  if (body.represented_by !== undefined) {
    updateFields.represented_by = body.represented_by?.trim() || null;
  }
  if (body.policy_number !== undefined) {
    updateFields.policy_number = body.policy_number?.trim() || null;
  }
  if (body.cause_number !== undefined) {
    updateFields.cause_number = body.cause_number?.trim() || null;
  }
  if (body.claim_number !== undefined) {
    updateFields.claim_number = body.claim_number?.trim() || null;
  }

  if (body.other_parties !== undefined) {
    updateFields.other_parties = body.other_parties ?? [];
  }

  const { data: updated, error } = await supabase
    .from("projects")
    .update(updateFields)
    .eq("project_id", body.project_id)
    .select("project_id")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update project." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, project_id: updated.project_id });
}

