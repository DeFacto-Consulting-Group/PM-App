import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasSupabaseCookie = /\bsb-[^=]+=/i.test(cookieHeader);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return NextResponse.json({
      ok: true,
      hasSupabaseCookie,
      user: user
        ? { id: user.id, email: user.email ?? null }
        : null,
      authError: error?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        hasSupabaseCookie,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

