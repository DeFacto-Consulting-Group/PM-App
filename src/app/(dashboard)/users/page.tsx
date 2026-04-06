"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Plus, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/types/index";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { DFCG_DIRECTORY_USERS } from "@/data/dfcg-directory-users";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  status: "active" | "inactive";
  initials: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  pic: "Professional-in-Charge",
  project_manager: "Project Manager",
  guest: "Guest",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  pic: "bg-teal-100 text-teal-800 border-teal-200",
  project_manager: "bg-blue-100 text-blue-800 border-blue-200",
  guest: "bg-gray-100 text-gray-600 border-gray-200",
};

const ROLE_SHORT: Record<UserRole, string> = {
  admin: "Admin",
  pic: "PIC",
  project_manager: "PM",
  guest: "Guest",
};

/** Fall back to directory from `DFCG users.xlsx` when Supabase is not configured. */
const mockUsers: UserRow[] = DFCG_DIRECTORY_USERS.map((u) => ({ ...u }));

interface NewUserForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  status: "active" | "inactive";
}

function sortUsersByName(list: UserRow[]) {
  return [...list].sort((a, b) => {
    const la = `${a.last_name} ${a.first_name}`.toLowerCase();
    const lb = `${b.last_name} ${b.first_name}`.toLowerCase();
    return la.localeCompare(lb, undefined, { sensitivity: "base" });
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>(() =>
    isSupabaseConfigured ? [] : mockUsers
  );
  const [usersLoadState, setUsersLoadState] = useState<
    "idle" | "loading" | "ok" | "error"
  >(() => (isSupabaseConfigured ? "loading" : "ok"));
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<NewUserForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    role: "guest",
    status: "active",
  });

  const resetForm = () => {
    setUserForm({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      role: "guest",
      status: "active",
    });
  };

  const toInitials = (firstName: string, lastName: string) => {
    const f = firstName.charAt(0);
    const l = lastName.charAt(0);
    if (f && l) return `${f}${l}`.toUpperCase();
    if (f) return firstName.slice(0, 2).toUpperCase() || f.toUpperCase();
    return "?";
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUserId(null);
    setUserFormError(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setUserFormError(null);
    resetForm();
    setIsUserModalOpen(true);
  };

  const openEditModal = (user: UserRow) => {
    setEditingUserId(user.id);
    setUserFormError(null);
    setUserForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: formatPhoneDisplay(user.phone_number ?? ""),
      role: user.role,
      status: user.status,
    });
    setIsUserModalOpen(true);
  };

  useEffect(() => {
    const loadUsers = async () => {
      if (!isSupabaseConfigured) return;

      setUsersLoadState("loading");
      setUsersLoadError(null);

      try {
        const response = await fetch("/api/users", { method: "GET" });
        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(result.error ?? "Failed to load users.");
        }

        const result = (await response.json()) as {
          users: Array<{
            id: string;
            first_name: string;
            last_name: string;
            email: string;
            phone_number: string | null;
            role: UserRole;
            status: "active" | "inactive";
          }>;
        };

        const mapped = sortUsersByName(
          result.users.map((user) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number
              ? formatPhoneDisplay(user.phone_number)
              : null,
            role: user.role,
            status: user.status,
            initials: toInitials(user.first_name, user.last_name),
          }))
        );

        setUsers(mapped);
        setUsersLoadState("ok");
      } catch (error) {
        console.error(error);
        setUsersLoadError(
          error instanceof Error ? error.message : "Failed to load users."
        );
        setUsersLoadState("error");
        setUsers([]);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.first_name} ${u.last_name}`.toLowerCase();
      const email = u.email.toLowerCase();
      const phone = (u.phone_number ?? "").replace(/\D/g, "");
      const qDigits = q.replace(/\D/g, "");
      const phoneMatch = qDigits.length >= 3 && phone.includes(qDigits);
      return (
        name.includes(q) ||
        email.includes(q) ||
        phoneMatch ||
        ROLE_LABELS[u.role].toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  const activeCount = users.filter((u) => u.status === "active").length;
  const inactiveCount = users.length - activeCount;
  const roleSummary = useMemo(() => {
    const counts: Record<UserRole, number> = {
      admin: 0,
      pic: 0,
      project_manager: 0,
      guest: 0,
    };
    for (const u of users) counts[u.role] += 1;
    return counts;
  }, [users]);

  const roleSummaryLine = useMemo(() => {
    return (Object.keys(ROLE_LABELS) as UserRole[])
      .filter((r) => roleSummary[r] > 0)
      .map((r) => `${roleSummary[r]} ${ROLE_SHORT[r]}`)
      .join(" · ");
  }, [roleSummary]);

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserFormError(null);

    const firstName = userForm.first_name.trim();
    const lastName = userForm.last_name.trim();
    const email = userForm.email.trim();
    const phoneNumberRaw = userForm.phone_number.trim();
    const phoneNumber = phoneNumberRaw ? formatPhoneDisplay(phoneNumberRaw) : "";
    if (!firstName || !lastName || !email) return;

    if (!isSupabaseConfigured) {
      if (editingUserId) {
        setUsers((prev) =>
          sortUsersByName(
            prev.map((user) =>
              user.id === editingUserId
                ? {
                    ...user,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone_number: phoneNumber || null,
                    role: userForm.role,
                    status: userForm.status,
                    initials: toInitials(firstName, lastName),
                  }
                : user
            )
          )
        );
      } else {
        const createdUser: UserRow = {
          id: `u${users.length + 1}`,
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phoneNumber || null,
          role: userForm.role,
          status: userForm.status,
          initials: toInitials(firstName, lastName),
        };
        setUsers((prev) => sortUsersByName([createdUser, ...prev]));
      }
      closeUserModal();
      return;
    }

    setIsSavingUser(true);
    try {
      const response = await fetch("/api/users", {
        method: editingUserId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingUserId ? { id: editingUserId } : {}),
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phoneNumber || null,
          role: userForm.role,
          status: userForm.status,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone_number: string | null;
          role: UserRole;
          status: "active" | "inactive";
        };
      };

      if (!response.ok || !result.user) {
        throw new Error(
          result.error ??
            (editingUserId ? "Failed to update user." : "Failed to create user.")
        );
      }

      const savedUser: UserRow = {
        id: result.user.id,
        first_name: result.user.first_name,
        last_name: result.user.last_name,
        email: result.user.email,
        phone_number: result.user.phone_number
          ? formatPhoneDisplay(result.user.phone_number)
          : null,
        role: result.user.role,
        status: result.user.status,
        initials: toInitials(result.user.first_name, result.user.last_name),
      };

      if (editingUserId) {
        setUsers((prev) =>
          sortUsersByName(
            prev.map((user) => (user.id === editingUserId ? savedUser : user))
          )
        );
      } else {
        setUsers((prev) => sortUsersByName([savedUser, ...prev]));
      }
      closeUserModal();
    } catch (error) {
      setUserFormError(
        error instanceof Error
          ? error.message
          : editingUserId
            ? "Failed to update user."
            : "Failed to create user."
      );
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleteError(null);

    if (!isSupabaseConfigured) {
      setUsers((prev) => prev.filter((user) => user.id !== userToDelete.id));
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userToDelete.id }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete user.");
      }

      setUsers((prev) => prev.filter((user) => user.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete user."
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            {!isSupabaseConfigured && (
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
              >
                Demo data
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage team members, roles, and Supabase sign-in accounts
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 self-start sm:self-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add User
        </Button>
      </div>

      {usersLoadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Could not load users</p>
          <p className="mt-1">{usersLoadError}</p>
        </div>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {usersLoadState === "loading" && isSupabaseConfigured
                  ? "Loading from Supabase…"
                  : usersLoadState === "error"
                    ? "Fix the error above and refresh the page."
                    : users.length === 0
                      ? "No users yet. Add someone or sync from your directory."
                      : `${activeCount} active · ${inactiveCount} inactive · ${roleSummaryLine}`}
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                type="search"
                placeholder="Search name, email, phone, role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background pl-9"
                disabled={
                  usersLoadState === "loading" ||
                  (users.length === 0 && isSupabaseConfigured)
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="whitespace-nowrap">Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoadState === "loading" && isSupabaseConfigured ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <span className="text-muted-foreground inline-flex items-center justify-center gap-2">
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        aria-hidden
                      />
                      Loading users…
                    </span>
                  </TableCell>
                </TableRow>
              ) : usersLoadState === "error" ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    Users could not be loaded. Check the message above or your
                    session permissions.
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 && users.length > 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    No users match &ldquo;{searchQuery.trim()}&rdquo;. Try
                    another search.
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    {isSupabaseConfigured
                      ? "No team members in the database yet. Use Add User or your import script."
                      : "These sample rows are shown when Supabase is not configured."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarFallback className="text-[10px]">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.phone_number
                      ? formatPhoneDisplay(user.phone_number)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={ROLE_COLORS[user.role]}
                      variant="outline"
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.status === "active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }
                    >
                      {user.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => openEditModal(user)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setDeleteError(null);
                              setUserToDelete(user);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isUserModalOpen}
        onOpenChange={(open) => {
          if (!open) closeUserModal();
        }}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Update this team member's details."
                : "Enter the new team member's details."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveUser}>
            {userFormError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {userFormError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={userForm.first_name}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={userForm.last_name}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                type="tel"
                autoComplete="tel"
                value={userForm.phone_number}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    phone_number: e.target.value,
                  }))
                }
                onBlur={() =>
                  setUserForm((prev) => ({
                    ...prev,
                    phone_number: formatPhoneDisplay(prev.phone_number),
                  }))
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(v) =>
                    setUserForm((prev) => ({
                      ...prev,
                      role: (v ?? "guest") as UserRole,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role">
                      {ROLE_LABELS[userForm.role]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={userForm.status}
                  onValueChange={(v) =>
                    setUserForm((prev) => ({
                      ...prev,
                      status: (v ?? "active") as "active" | "inactive",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status">
                      {userForm.status === "active" ? "Active" : "Inactive"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="bg-white">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingUser}
                onClick={closeUserModal}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingUser}>
                {isSavingUser
                  ? editingUserId
                    ? "Saving..."
                    : "Creating..."
                  : editingUserId
                    ? "Save Changes"
                    : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {userToDelete
                ? `This will permanently remove ${userToDelete.first_name} ${userToDelete.last_name}.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingUser}
              onClick={() => {
                setUserToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingUser}
              onClick={handleDeleteUser}
            >
              {isDeletingUser ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
