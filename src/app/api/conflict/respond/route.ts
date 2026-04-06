import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type ConflictAnswer = "no_conflict" | "possible_conflict";

async function applyResponse(args: {
  token: string;
  response: ConflictAnswer;
  conflict_details?: string | null;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existingResponse, error: existingResponseError } = await supabase
    .from("conflict_responses")
    .select("id, conflict_check_id, response")
    .eq("token", args.token)
    .single();

  if (existingResponseError || !existingResponse) {
    return { error: "Invalid or expired response token.", status: 404 as const };
  }

  const { data: updatedResponse, error: updateError } = await supabase
    .from("conflict_responses")
    .update({
      response: args.response,
      conflict_details:
        args.response === "possible_conflict"
          ? args.conflict_details?.trim() || "Possible conflict indicated via email response."
          : null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", existingResponse.id)
    .select("conflict_check_id")
    .single();

  if (updateError || !updatedResponse) {
    return { error: updateError?.message ?? "Unable to save response.", status: 400 as const };
  }

  const conflictCheckId = updatedResponse.conflict_check_id as string;

  const { data: checkInfo, error: checkInfoError } = await supabase
    .from("conflict_checks")
    .select("id, project_id, total_recipients")
    .eq("id", conflictCheckId)
    .single();

  if (checkInfoError || !checkInfo) {
    return { error: checkInfoError?.message ?? "Conflict check not found.", status: 404 as const };
  }

  const { data: allResponses, error: allResponsesError } = await supabase
    .from("conflict_responses")
    .select("response, responded_at")
    .eq("conflict_check_id", conflictCheckId);

  if (allResponsesError) {
    return { error: allResponsesError.message, status: 400 as const };
  }

  const answered = (allResponses ?? []).filter((r) => !!r.responded_at);
  const hasPossibleConflict = answered.some((r) => r.response === "possible_conflict");
  const totalRecipients = Number(checkInfo.total_recipients) || 0;
  const allAnswered = totalRecipients > 0 && answered.length >= totalRecipients;

  const { data: projectInfo, error: projectInfoError } = await supabase
    .from("projects")
    .select("id, engagement_type")
    .eq("id", checkInfo.project_id)
    .single();

  if (projectInfoError || !projectInfo) {
    return { error: projectInfoError?.message ?? "Project not found.", status: 404 as const };
  }

  const isAppraisal = projectInfo.engagement_type === "appraisal";

  let nextConflictCheckStatus: "pending" | "cleared" | "conflict_found" = "pending";
  let nextProjectStatus:
    | "pending_conflict"
    | "conflict_review"
    | "pending_ea_retainer_auth"
    | "active" = "pending_conflict";

  if (hasPossibleConflict) {
    nextConflictCheckStatus = "conflict_found";
    nextProjectStatus = "conflict_review";
  } else if (allAnswered) {
    nextConflictCheckStatus = "cleared";
    nextProjectStatus = isAppraisal ? "active" : "pending_ea_retainer_auth";
  }

  const { error: checkUpdateError } = await supabase
    .from("conflict_checks")
    .update({
      responses_received: answered.length,
      status: nextConflictCheckStatus,
    })
    .eq("id", conflictCheckId);

  if (checkUpdateError) {
    return { error: checkUpdateError.message, status: 400 as const };
  }

  const { error: projectUpdateError } = await supabase
    .from("projects")
    .update({
      status: nextProjectStatus,
    })
    .eq("id", checkInfo.project_id);

  if (projectUpdateError) {
    return { error: projectUpdateError.message, status: 400 as const };
  }

  return { ok: true as const, nextProjectStatus, nextConflictCheckStatus };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const response = searchParams.get("response")?.trim() as ConflictAnswer | null;

  if (!token || (response !== "no_conflict" && response !== "possible_conflict")) {
    return new NextResponse(
      "<h1>Invalid conflict response link</h1><p>Please contact DFCG support.</p>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const result = await applyResponse({ token, response });
  if ("error" in result) {
    return new NextResponse(`<h1>Unable to record response</h1><p>${result.error}</p>`, {
      status: result.status,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new NextResponse(
    "<h1>Thank you</h1><p>Your conflict check response has been recorded successfully.</p>",
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    token?: string;
    response?: ConflictAnswer;
    conflict_details?: string;
  };

  const token = body.token?.trim();
  const response = body.response;
  if (!token || (response !== "no_conflict" && response !== "possible_conflict")) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await applyResponse({
    token,
    response,
    conflict_details: body.conflict_details ?? null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    conflict_check_status: result.nextConflictCheckStatus,
    project_status: result.nextProjectStatus,
  });
}
