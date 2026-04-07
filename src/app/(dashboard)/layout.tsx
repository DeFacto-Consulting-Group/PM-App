import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Profile } from "@/types/index";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

type ProfileLoadResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: "supabase_not_configured" | "unauthorized" | "missing_or_denied" };

async function getProfile(): Promise<ProfileLoadResult> {
  if (!isSupabaseConfigured) {
    return { ok: true, profile: mockProfile };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone_number, role, status, created_at, updated_at"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // If RLS policies aren't applied, this will be "permission denied" and `profile` will be null.
    // If profiles aren’t seeded, it’ll also be null.
    return { ok: false, reason: "missing_or_denied" };
  }

  return { ok: true, profile: profile as Profile };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getProfile();

  if (!result.ok) {
    if (result.reason === "unauthorized") {
      redirect("/login");
    }

    return (
      <div className="min-h-screen bg-[#f5f3ee]">
        <main className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-xl bg-white p-6 ring-1 ring-foreground/10">
            <h1 className="text-lg font-semibold">Account setup required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You’re signed in, but the app can’t load your <span className="font-mono">profiles</span>{" "}
              record.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Ensure there is a row in <span className="font-mono">public.profiles</span> with{" "}
                <span className="font-mono">id</span> = your auth user id.
              </li>
              <li>
                Ensure RLS policies are applied (at minimum: a SELECT policy for{" "}
                <span className="font-mono">authenticated</span> on <span className="font-mono">profiles</span>).
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <Button render={<Link href="/login" />} nativeButton={false}>
                Back to login
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const userProfile = result.profile;

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
