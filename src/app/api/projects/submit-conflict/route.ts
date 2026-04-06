import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ClientType,
  EngagementType,
  OtherParty,
  PerilType,
  StructureType,
} from "@/types/index";
import {
  OTHER_PARTY_ROLE_LABELS,
  OTHER_PARTY_STANDING_LABELS,
} from "@/types/index";
import { formatNotesForDisplay } from "@/lib/notes-mentions-display";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

interface SubmitConflictPayload {
  name: string;
  client_name: string;
  client_type: ClientType;
  client_address?: string;
  point_of_contact?: string;
  point_of_contact_secondary?: string;
  representing?: string;
  engagement_types: EngagementType[];
  property_address: string;
  lead_consultant?: string;
  opposing_parties: string[];
  represented_by?: string;
  other_parties?: OtherParty[];
  case_number_type?: "case_number" | "cause_number";
  case_number?: string;
  date_of_loss?: string;
  peril?: PerilType;
  structure_type?: StructureType;
  report_due_date?: string;
  policy_number?: string;
  cause_number?: string;
  claim_number?: string;
  narrative?: string;
  notes?: string;
}

async function sendConflictNotificationEmail(args: {
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  token: string;
  otherParties?: OtherParty[];
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONFLICT_NOTIFICATION_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    return;
  }

  function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#039;";
        default:
          return ch;
      }
    });
  }

  const otherPartiesSection =
    (args.otherParties?.length ?? 0) > 0
      ? `
        <div style="margin-top:12px;">
          <p style="margin:0 0 6px 0;font-weight:600;">Other Parties</p>
          <ul style="margin:0;padding-left:18px;">
            ${args.otherParties!
              .map((p) => {
                const roleLabel =
                  OTHER_PARTY_ROLE_LABELS[p.role] ?? String(p.role);
                const standingLabel =
                  OTHER_PARTY_STANDING_LABELS[p.standing] ??
                  String(p.standing);
                const notesMarkup = p.notes?.trim()
                  ? formatNotesForDisplay(p.notes)
                  : "";

                return `<li style="margin:0 0 8px 0;">
                  <div><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(
                    roleLabel
                  )} — ${escapeHtml(standingLabel)}</div>
                  ${
                    notesMarkup
                      ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">Notes: ${escapeHtml(
                          notesMarkup
                        )}</div>`
                      : ""
                  }
                </li>`;
              })
              .join("")}
          </ul>
        </div>
      `
      : "";

  const noConflictUrl = `${appBaseUrl}/api/conflict/respond?token=${args.token}&response=no_conflict`;
  const possibleConflictUrl = `${appBaseUrl}/api/conflict/respond?token=${args.token}&response=possible_conflict`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [args.recipientEmail],
      subject: `Conflict Check Required: ${args.projectName}`,
      html: `
        <p>Hello ${args.recipientName},</p>
        <p>Please review and respond to this conflict check for <strong>${args.projectName}</strong>.</p>
        <p>
          <a href="${noConflictUrl}" style="padding:10px 14px;background:#10b981;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">No Conflict</a>
          <a href="${possibleConflictUrl}" style="padding:10px 14px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px;">Possible Conflict</a>
        </p>
        ${otherPartiesSection}
      `,
    }),
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured for this environment. Configure Supabase to submit conflict checks.",
      },
      { status: 400 }
    );
  }

  const body = (await request.json()) as SubmitConflictPayload;
  const engagementTypes = body.engagement_types;
  if (
    !body.name ||
    !body.client_name ||
    !body.client_type ||
    !body.property_address ||
    !engagementTypes?.length
  ) {
    return NextResponse.json({ error: "Missing required project fields." }, { status: 400 });
  }
  if (engagementTypes.includes("appraisal") && engagementTypes.length > 1) {
    return NextResponse.json(
      { error: "Appraisal cannot be combined with other engagement types." },
      { status: 400 }
    );
  }
  const primaryEngagement = engagementTypes[0]!;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: ownerProfile, error: ownerProfileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (ownerProfileError || !ownerProfile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (!["admin", "pic"].includes(ownerProfile.role)) {
    return NextResponse.json(
      { error: "Only Admin and PIC can submit projects for conflict check." },
      { status: 403 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: body.name.trim(),
      client_name: body.client_name.trim(),
      client_type: body.client_type,
      client_address: body.client_address?.trim() ?? "",
      point_of_contact: body.point_of_contact?.trim() || null,
      point_of_contact_secondary:
        body.point_of_contact_secondary?.trim() || null,
      representing: body.representing?.trim() || null,
      engagement_type: primaryEngagement,
      engagement_types: engagementTypes,
      property_address: body.property_address.trim(),
      opposing_parties: body.opposing_parties ?? [],
      other_parties: body.other_parties ?? [],
      represented_by: body.represented_by?.trim() || null,
      case_number_type: body.case_number_type ?? "case_number",
      case_number: body.case_number?.trim() || null,
      date_of_loss: body.date_of_loss || null,
      peril: body.peril ?? null,
      structure_type: body.structure_type ?? null,
      report_due_date: body.report_due_date || null,
      policy_number: body.policy_number?.trim() || null,
      cause_number: body.cause_number?.trim() || null,
      claim_number: body.claim_number?.trim() || null,
      narrative: body.narrative?.trim() || "",
      notes: body.notes?.trim() || null,
      status: "pending_conflict",
      owner_id: ownerProfile.id,
    })
    .select("id, project_id, name")
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Failed to create project." },
      { status: 400 }
    );
  }

  const { data: recipients, error: recipientsError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("status", "active");

  if (recipientsError) {
    return NextResponse.json({ error: recipientsError.message }, { status: 400 });
  }

  const recipientList = (recipients ?? []).map((recipient) => ({
    id: recipient.id as string,
    name: `${recipient.first_name as string} ${recipient.last_name as string}`.trim(),
    email: recipient.email as string,
  }));

  const { data: conflictCheck, error: conflictCheckError } = await supabase
    .from("conflict_checks")
    .insert({
      project_id: project.id,
      sent_to: recipientList.map((recipient) => recipient.email),
      matched_projects: null,
      total_recipients: recipientList.length,
      responses_received: 0,
      status: "pending",
    })
    .select("id")
    .single();

  if (conflictCheckError || !conflictCheck) {
    return NextResponse.json(
      { error: conflictCheckError?.message ?? "Failed to create conflict check." },
      { status: 400 }
    );
  }

  const { data: conflictResponses, error: responseInsertError } = await supabase
    .from("conflict_responses")
    .insert(
      recipientList.map((recipient) => ({
        conflict_check_id: conflictCheck.id,
        responder_name: recipient.name,
        responder_email: recipient.email,
      }))
    )
    .select("token, responder_name, responder_email");

  if (responseInsertError) {
    return NextResponse.json(
      { error: responseInsertError.message },
      { status: 400 }
    );
  }

  await Promise.all(
    (conflictResponses ?? []).map((response) =>
      sendConflictNotificationEmail({
        recipientEmail: response.responder_email as string,
        recipientName: response.responder_name as string,
        projectName: project.name as string,
        token: response.token as string,
        otherParties: body.other_parties ?? [],
      })
    )
  );

  return NextResponse.json({
    project_id: project.project_id,
    conflict_check_id: conflictCheck.id,
    notifications_sent: (conflictResponses ?? []).length,
  });
}
