import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Profile } from "@/types/index";

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
      "id, first_name, last_name, email, phone_number, role, status, avatar_url, created_at, updated_at"
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return profile as Profile;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userProfile = await getProfile();

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <div className="hidden md:block">
        <Sidebar profile={userProfile} />
      </div>

      <MobileNav profile={userProfile} />

      <main className="md:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
