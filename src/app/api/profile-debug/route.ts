import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        { ok: false, step: "getUser", error: userError.message },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, step: "getUser", error: "No user in session." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone_number, role, status, created_at, updated_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email ?? null },
      profile,
      profileError: profileError?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

