"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, Loader2 } from "lucide-react";
import { terms } from "@/lib/config/branding";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"welcome" | "create" | "join">("welcome");
  const [isCreating, setIsCreating] = useState(false);

  // Create organization state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  const handleCreateOrganization = async () => {
    if (!orgName || !orgSlug) return;

    setIsCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        } as any)
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as OWNER
      const { error: memberError } = await supabase
        .from("org_memberships")
        .insert({
          org_id: (org as any).id,
          user_id: user.id,
          role: "OWNER",
        } as any);

      if (memberError) throw memberError;

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      if (error.message?.includes("duplicate") || error.code === "23505") {
        alert(
          "This slug is already taken. Please choose a different one."
        );
      } else {
        alert("Failed to create organization. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-2xl p-8">
        {step === "welcome" && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-foreground">
                Welcome to VAULTS
              </h1>
              <p className="text-lg text-muted-foreground">
                Let's get you set up. Choose an option to get started:
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-8">
              <button
                onClick={() => setStep("create")}
                className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    Create a {terms.vault}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start your own {terms.vaultLower} and invite team members
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/settings")}
                className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    Join a {terms.vault}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set up your profile while you wait for an invitation
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/settings")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip for now and go to profile settings
              </Button>
            </div>
          </div>
        )}

        {step === "create" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Create Your {terms.vault}
              </h2>
              <p className="text-muted-foreground">
                Choose a name and URL identifier for your {terms.vaultLower}
              </p>
            </div>

            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="org-name">{terms.vault} Name *</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    if (!orgSlug) {
                      // Auto-generate slug from name
                      setOrgSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                      );
                    }
                  }}
                  placeholder="My Company"
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-slug">URL Identifier (slug) *</Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) =>
                    setOrgSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="my-company"
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and must be unique (lowercase letters, numbers,
                  and hyphens only)
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => setStep("welcome")}
                className="flex-1"
                disabled={isCreating}
              >
                Back
              </Button>
              <Button
                onClick={handleCreateOrganization}
                className="flex-1"
                disabled={!orgName || !orgSlug || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create {terms.vault}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
