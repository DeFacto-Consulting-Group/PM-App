import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      profile: {
        first_name: "John",
        last_name: "Harrison",
        email: "john.harrison@dfcg.com",
        phone_number: "(555) 123-4567",
      },
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone_number")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { error: error?.message ?? "Profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    first_name?: string;
    last_name?: string;
    phone_number?: string | null;
  };

  const firstName = body.first_name?.trim();
  const lastName = body.last_name?.trim();
  const phoneNumber = body.phone_number?.trim() ?? null;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      profile: {
        first_name: firstName,
        last_name: lastName,
        email: "john.harrison@dfcg.com",
        phone_number: phoneNumber,
      },
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
    })
    .eq("id", user.id)
    .select("first_name, last_name, email, phone_number")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update profile." },
      { status: 400 }
    );
  }

  return NextResponse.json({ profile: updated });
}
