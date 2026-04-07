import { redirect } from "next/navigation";
import type { Profile } from "@/types/index";
import { AccountsClient } from "./accounts-client";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

const mockProfile: Profile = {
  id: "mock-user-id",
  first_name: "Tim",
  last_name: "Reynolds",
  email: "tim@dfcg.com",
  phone_number: "(555) 123-4567",
  role: "admin",
  status: "active",
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function getProfile(): Promise<Profile> {
  if (!isSupabaseConfigured) {
    return mockProfile;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone_number, role, status"
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();
  return {
    ...(profile as Omit<Profile, "avatar_url" | "created_at" | "updated_at">),
    avatar_url: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export default async function AccountsPage() {
  const profile = await getProfile();
  return <AccountsClient profile={profile} />;
}
