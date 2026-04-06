"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPhoneDisplay } from "@/lib/format-phone";

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const response = await fetch("/api/profile", { method: "GET" });
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          profile?: {
            first_name: string;
            last_name: string;
            email: string;
            phone_number: string | null;
          };
        };

        if (!response.ok || !result.profile) {
          throw new Error(result.error ?? "Failed to load profile.");
        }

        setProfile({
          first_name: result.profile.first_name ?? "",
          last_name: result.profile.last_name ?? "",
          email: result.profile.email ?? "",
          phone_number: formatPhoneDisplay(result.profile.phone_number ?? ""),
        });
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "Failed to load profile."
        );
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);

    const firstName = profile.first_name.trim();
    const lastName = profile.last_name.trim();
    if (!firstName || !lastName) {
      setProfileError("First Name and Last Name are required.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone_number: (() => {
            const p = profile.phone_number.trim();
            return p ? formatPhoneDisplay(p) : null;
          })(),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: {
          first_name: string;
          last_name: string;
          email: string;
          phone_number: string | null;
        };
      };

      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "Failed to save profile.");
      }

      setProfile({
        first_name: result.profile.first_name,
        last_name: result.profile.last_name,
        email: result.profile.email,
        phone_number: formatPhoneDisplay(result.profile.phone_number ?? ""),
      });
      setProfileMessage("Profile updated successfully.");
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to save profile."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSaveProfile}>
            {profileError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {profileMessage}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  disabled={isLoadingProfile || isSavingProfile}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  disabled={isLoadingProfile || isSavingProfile}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Contact an administrator to change your email
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={profile.phone_number}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    phone_number: e.target.value,
                  }))
                }
                onBlur={() =>
                  setProfile((prev) => ({
                    ...prev,
                    phone_number: formatPhoneDisplay(prev.phone_number),
                  }))
                }
                disabled={isLoadingProfile || isSavingProfile}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoadingProfile || isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Current Password</Label>
            <Input id="current_password" type="password" />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="new_password">New Password</Label>
            <Input id="new_password" type="password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input id="confirm_password" type="password" />
          </div>
          <div className="flex justify-end">
            <Button>Update Password</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
