"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  ListChecks,
  Building2,
  Users,
  ScrollText,
  Settings,
  LogOut,
  ChevronsUpDown,
  ClipboardList,
  NotebookText,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/index";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "New Project", icon: FilePlus },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/diary", label: "Diary", icon: NotebookText },
];

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const showAdminItems = profile.role === "admin" || profile.role === "pic";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#102a43]">
      <div className="px-5 py-5">
        <Link href="/" className="block">
          <Image
            src="/dfcg-logo.png"
            alt="DeFacto Consulting Group"
            width={180}
            height={60}
            className="brightness-0 invert"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 px-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Main
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-l-2 border-white bg-[#1f3b64] text-white"
                      : "text-white/70 hover:bg-[#1f3b64]/50 hover:text-white"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-[#1f3b64]/50"
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-white/20 text-xs text-white">
                {getInitials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">
                {profile.first_name} {profile.last_name}
              </p>
              <Badge
                variant="secondary"
                className="mt-0.5 scale-90 origin-left bg-white/15 text-[10px] text-white/80 border-none"
              >
                {formatRole(profile.role)}
              </Badge>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-white/40" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {profile.first_name} {profile.last_name}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {showAdminItems && (
              <>
                <DropdownMenuItem onClick={() => router.push("/users")}>
                  <Users className="size-4" />
                  Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/audit-log")}>
                  <ScrollText className="size-4" />
                  Audit Log
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/task-templates")}>
                  <ClipboardList className="size-4" />
                  Task Templates
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
