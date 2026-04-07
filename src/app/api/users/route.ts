import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/index";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  status: "active" | "inactive";
}

const validRoles: UserRole[] = ["admin", "pic", "project_manager", "guest"];
const validStatuses: Array<"active" | "inactive"> = ["active", "inactive"];

async function getAuthorizedUser() {
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

  return { supabase, user, role: profile.role as UserRole };
}

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  }

  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
}

async function requireAdminOrPic() {
  const auth = await getAuthorizedUser();
  if ("error" in auth) {
    return auth;
  }
  if (auth.role !== "admin" && auth.role !== "pic") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ users: [] });
  }

  const auth = await getAuthorizedUser();
  if ("error" in auth) return auth.error;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone_number, role, status")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: (data ?? []) as ProfileRow[] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured for this environment." },
      { status: 400 }
    );
  }

  const auth = await requireAdminOrPic();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as Partial<ProfileRow>;
  const firstName = body.first_name?.trim();
  const lastName = body.last_name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phoneNumber = body.phone_number?.trim() ?? null;
  const role = body.role;
  const status = body.status;

  if (!firstName || !lastName || !email || !role || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const adminClient = getAdminClient();

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      },
    }
  );

  if (inviteError || !invited.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to invite user" },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: invited.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber,
        role,
        status,
      },
      { onConflict: "id" }
    )
    .select("id, first_name, last_name, email, phone_number, role, status")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ user: profile as ProfileRow }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured for this environment." },
      { status: 400 }
    );
  }

  const auth = await requireAdminOrPic();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as Partial<ProfileRow>;
  const id = body.id?.trim();
  const firstName = body.first_name?.trim();
  const lastName = body.last_name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phoneNumber = body.phone_number?.trim() ?? null;
  const role = body.role;
  const status = body.status;

  if (!id || !firstName || !lastName || !email || !role || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const adminClient = getAdminClient();

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("id", id)
    .single();

  if (existingProfileError || !existingProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (existingProfile.email !== email) {
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(id, {
      email,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      },
    });

    if (updateAuthError) {
      return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
    }
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
      role,
      status,
    })
    .eq("id", id)
    .select("id, first_name, last_name, email, phone_number, role, status")
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? "Failed to update profile" },
      { status: 400 }
    );
  }

  return NextResponse.json({ user: profile as ProfileRow });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured for this environment." },
      { status: 400 }
    );
  }

  const auth = await requireAdminOrPic();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as { id?: string };
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own user account." },
      { status: 400 }
    );
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
