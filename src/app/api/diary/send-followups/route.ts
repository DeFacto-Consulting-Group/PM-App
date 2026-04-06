import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { extractMentionIds } from "@/lib/mentions";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

const TZ = "America/Chicago";

function ymdInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  return `${y}-${m}-${d}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + days));
  // Format back in the same TZ to avoid off-by-one around DST boundaries.
  return ymdInTimeZone(dt, TZ);
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

type DiaryRow = {
  id: string;
  linked_project: string;
  follow_up_date: string; // YYYY-MM-DD
  notes: string | null;
  created_by: string;
};

function buildEmailHtml(args: {
  dateYmd: string;
  kind: "due" | "reminder";
  rows: DiaryRow[];
}) {
  const dateLabel = new Date(`${args.dateYmd}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const title =
    args.kind === "reminder"
      ? `Reminder: Diary follow-ups for ${dateLabel}`
      : `Diary follow-ups for ${dateLabel}`;

  const list = args.rows
    .map((r) => {
      const notes = r.notes?.trim() ? escapeHtml(r.notes.trim()) : "";
      return `<li style="margin:0 0 10px 0;">
        <div style="font-weight:600;">${escapeHtml(r.linked_project)}</div>
        ${notes ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${notes}</div>` : ""}
      </li>`;
    })
    .join("");

  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <p style="margin:0 0 10px 0;">${escapeHtml(title)}</p>
      <ul style="margin:0;padding-left:18px;">
        ${list}
      </ul>
      <p style="margin:14px 0 0 0;color:#6b7280;font-size:12px;">
        (Sent automatically at midnight CST.)
      </p>
    </div>
  `;
}

async function sendEmail(args: {
  to: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.DIARY_NOTIFICATION_FROM_EMAIL;
  if (!resendKey || !fromEmail) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });
}

export async function POST(request: Request) {
  // Simple cron auth
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured for this environment." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();

  // Compute CST dates (America/Chicago)
  const todayYmd = ymdInTimeZone(new Date(), TZ);
  const tomorrowYmd = addDaysYmd(todayYmd, 1);

  const targetDates: Array<{ ymd: string; kind: "due" | "reminder" }> = [
    { ymd: todayYmd, kind: "due" },
    { ymd: tomorrowYmd, kind: "reminder" },
  ];

  const results: Record<string, { sent: boolean; recipients: number; entries: number }> = {};

  for (const target of targetDates) {
    const { data: rows, error } = await supabase
      .from("diary_entries")
      .select("id, linked_project, follow_up_date, notes, created_by")
      .eq("follow_up_date", target.ymd);

    if (error) {
      results[`${target.kind}:${target.ymd}`] = {
        sent: false,
        recipients: 0,
        entries: 0,
      };
      continue;
    }

    const entries = (rows ?? []) as DiaryRow[];
    if (entries.length === 0) {
      results[`${target.kind}:${target.ymd}`] = {
        sent: false,
        recipients: 0,
        entries: 0,
      };
      continue;
    }

    const creatorIds = Array.from(new Set(entries.map((e) => e.created_by).filter(Boolean)));
    const mentionIds = Array.from(
      new Set(entries.flatMap((e) => extractMentionIds(e.notes ?? "")))
    );
    const userIds = Array.from(new Set([...creatorIds, ...mentionIds]));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds)
      .eq("status", "active");

    const recipients = Array.from(
      new Set((profiles ?? []).map((p) => (p.email as string) ?? "").filter(Boolean))
    );

    if (recipients.length === 0) {
      results[`${target.kind}:${target.ymd}`] = {
        sent: false,
        recipients: 0,
        entries: entries.length,
      };
      continue;
    }

    const dateLabel = new Date(`${target.ymd}T00:00:00`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const subject =
      target.kind === "reminder"
        ? `Reminder: Diary follow-ups for ${dateLabel}`
        : `Diary follow-ups for ${dateLabel}`;

    await sendEmail({
      to: recipients,
      subject,
      html: buildEmailHtml({ dateYmd: target.ymd, kind: target.kind, rows: entries }),
      idempotencyKey: `diary-${target.kind}-${target.ymd}`,
    });

    results[`${target.kind}:${target.ymd}`] = {
      sent: true,
      recipients: recipients.length,
      entries: entries.length,
    };
  }

  return NextResponse.json({
    ok: true,
    timeZone: TZ,
    today: todayYmd,
    tomorrow: tomorrowYmd,
    results,
  });
}

