"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

type InvitationStatus =
  | { type: "loading" }
  | { type: "success"; orgName: string; orgSlug: string; role: string }
  | { type: "error"; error: string; message: string };

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<InvitationStatus>({ type: "loading" });
  const supabase = createClient();
  const { refreshOrganizations } = useOrganization();

  useEffect(() => {
    const acceptInvitation = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus({
          type: "error",
          error: "missing_token",
          message: "No invitation token provided",
        });
        return;
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(`/invite?token=${token}`);
        router.push(`/login?redirect=${returnUrl}`);
        return;
      }

      // Call the RPC function to accept the invitation
      const { data, error } = await supabase.rpc("accept_org_invite", {
        invite_token: token,
      });

      if (error) {
        console.error("Error accepting invitation:", error);
        setStatus({
          type: "error",
          error: "rpc_error",
          message: error.message || "Failed to accept invitation",
        });
        return;
      }

      if (!data.success) {
        setStatus({
          type: "error",
          error: data.error,
          message: data.message,
        });
        return;
      }

      // Success!
      setStatus({
        type: "success",
        orgName: data.org_name,
        orgSlug: data.org_slug,
        role: data.role,
      });

      // Refresh organizations to include the newly joined one
      await refreshOrganizations();

      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    };

    acceptInvitation();
  }, [searchParams, router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8">
        {status.type === "loading" && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">
              Accepting Invitation
            </h1>
            <p className="text-muted-foreground">
              Please wait while we process your invitation...
            </p>
          </div>
        )}

        {status.type === "success" && (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Welcome!</h1>
            <p className="text-muted-foreground mb-4">
              You have successfully joined{" "}
              <span className="font-semibold text-foreground">
                {status.orgName}
              </span>{" "}
              as a{" "}
              <span className="font-semibold text-foreground">
                {status.role}
              </span>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </div>
        )}

        {status.type === "error" && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">
              {status.error === "expired"
                ? "Invitation Expired"
                : status.error === "invalid_token"
                ? "Invalid Invitation"
                : status.error === "email_mismatch"
                ? "Email Mismatch"
                : status.error === "already_member"
                ? "Already a Member"
                : status.error === "missing_token"
                ? "Missing Token"
                : "Error"}
            </h1>
            <p className="text-muted-foreground mb-6">{status.message}</p>

            {status.error === "expired" && (
              <p className="text-sm text-muted-foreground mb-6">
                Please contact the organization admin to request a new
                invitation.
              </p>
            )}

            {status.error === "email_mismatch" && (
              <p className="text-sm text-muted-foreground mb-6">
                This invitation was sent to a different email address. Please
                log in with the correct account or contact the organization
                admin.
              </p>
            )}

            {status.error === "already_member" && (
              <p className="text-sm text-muted-foreground mb-6">
                You're already a member of this organization. You can access it
                from the dashboard.
              </p>
            )}

            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Card>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
