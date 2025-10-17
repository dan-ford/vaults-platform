"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { User, Loader2, Mail, Phone, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching profile:", fetchError);
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount AND on page visibility
  useEffect(() => {
    loadProfile();

    const handleVisibilityChange = () => {
      if (!document.hidden) loadProfile();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, () => {
        loadProfile();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleEditClick = () => {
    if (profile) {
      setEditFirstName(profile.first_name || "");
      setEditLastName(profile.last_name || "");
      setEditPhone(profile.phone || "");
      setError("");
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    if (!editFirstName.trim() || !editLastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const updates = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: editPhone.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // @ts-expect-error - Supabase type inference issue with profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      // Reload profile
      await loadProfile();
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container-xl space-y-5 pb-20 animate-fade-in">
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
          </div>
        </header>
        <Card className="p-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container-xl space-y-5 pb-20 animate-fade-in">
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
          </div>
        </header>
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <User className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
          <p className="text-lg font-medium text-muted-foreground mb-2">Profile not found</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Please sign in to view your profile
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-xl space-y-5 pb-20 animate-fade-in">
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Button onClick={handleEditClick}>Edit Profile</Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {profile.first_name} {profile.last_name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>

            {profile.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="font-medium">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Account Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm mt-1 break-all">{profile.user_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last updated</p>
              <p className="font-medium">{formatDate(profile.updated_at)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="editFirstName">First Name</Label>
              <Input
                id="editFirstName"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                disabled={isSaving}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editLastName">Last Name</Label>
              <Input
                id="editLastName"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                disabled={isSaving}
                placeholder="Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone (optional)</Label>
              <Input
                id="editPhone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={isSaving}
                placeholder="+44 20 1234 5678"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
