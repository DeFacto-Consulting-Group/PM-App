"use client";

import { useEffect, useState } from "react";
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
import { Plus, MoreHorizontal } from "lucide-react";
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

const mockUsers: UserRow[] = [
  {
    id: "u1",
    first_name: "John",
    last_name: "Harrison",
    email: "john.harrison@dfcg.com",
    phone_number: "(555) 123-4567",
    role: "admin",
    status: "active",
    initials: "JH",
  },
  {
    id: "u2",
    first_name: "Sarah",
    last_name: "Chen",
    email: "sarah.chen@dfcg.com",
    phone_number: "(555) 234-5678",
    role: "pic",
    status: "active",
    initials: "SC",
  },
  {
    id: "u3",
    first_name: "Michael",
    last_name: "Torres",
    email: "michael.torres@dfcg.com",
    phone_number: "(555) 345-6789",
    role: "project_manager",
    status: "active",
    initials: "MT",
  },
  {
    id: "u4",
    first_name: "Emily",
    last_name: "Walsh",
    email: "emily.walsh@dfcg.com",
    phone_number: "(555) 456-7890",
    role: "pic",
    status: "active",
    initials: "EW",
  },
  {
    id: "u5",
    first_name: "Robert",
    last_name: "Kim",
    email: "robert.kim@dfcg.com",
    phone_number: "(555) 567-8901",
    role: "project_manager",
    status: "active",
    initials: "RK",
  },
  {
    id: "u6",
    first_name: "Lisa",
    last_name: "Patel",
    email: "lisa.patel@dfcg.com",
    phone_number: "(555) 678-9012",
    role: "guest",
    status: "inactive",
    initials: "LP",
  },
];

interface NewUserForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  status: "active" | "inactive";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>(mockUsers);
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

  const toInitials = (firstName: string, lastName: string) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

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

        setUsers(
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
      } catch (error) {
        console.error(error);
      }
    };

    loadUsers();
  }, []);

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
        setUsers((prev) => [createdUser, ...prev]);
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
          prev.map((user) => (user.id === editingUserId ? savedUser : user))
        );
      } else {
        setUsers((prev) => [savedUser, ...prev]);
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage team members and roles
          </p>
        </div>
        <Button type="button" onClick={openCreateModal}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {users.filter((u) => u.status === "active").length} active
            members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
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
              ))}
            </TableBody>
          </Table>
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
