"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const token = params.token as string;

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Redirect to login with return URL
          router.push(
            `/login?redirect=${encodeURIComponent(`/invite/${token}`)}`,
          );
          return;
        }

        // Check if email is verified
        if (!user.email_confirmed_at) {
          setStatus("error");
          setMessage(
            "Please verify your email address before accepting invitations.",
          );
          return;
        }

        // Get invite details
        const { data: invite, error: inviteError } = await supabase
          .from("vault_invites")
          .select("*, vaults(name)")
          .eq("token", token)
          .single();

        if (inviteError || !invite) {
          setStatus("error");
          setMessage("Invalid or expired invitation link.");
          return;
        }

        // Check if already accepted
        if (invite.status === "accepted") {
          setStatus("success");
          setMessage("This invitation has already been accepted.");
          setTimeout(() => router.push(`/vaults/${invite.vault_id}`), 2000);
          return;
        }

        // Check if invite has expired
        if (new Date(invite.expires_at) < new Date()) {
          setStatus("error");
          setMessage("This invitation has expired.");
          return;
        }

        // Check if email matches
        if (invite.invitee_email !== user.email) {
          setStatus("error");
          setMessage(
            `This invitation was sent to ${invite.invitee_email}. Please sign in with that email address.`,
          );
          return;
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from("vault_members")
          .select("id")
          .eq("vault_id", invite.vault_id)
          .eq("user_id", user.id)
          .single();

        if (existingMember) {
          setStatus("success");
          setMessage("You are already a member of this vault.");
          setTimeout(() => router.push(`/vaults/${invite.vault_id}`), 2000);
          return;
        }

        // Add user to vault
        const { error: memberError } = await supabase
          .from("vault_members")
          .insert({
            vault_id: invite.vault_id,
            user_id: user.id,
            role: invite.role,
          });

        if (memberError) throw memberError;

        // Update invite status
        const { error: updateError } = await supabase
          .from("vault_invites")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", invite.id);

        if (updateError) {
          console.error("Failed to update invite status:", updateError);
        }

        setStatus("success");
        setMessage(
          `Successfully joined ${invite.vaults?.name || "the vault"}!`,
        );
        setTimeout(() => router.push(`/vaults/${invite.vault_id}`), 2000);
      } catch (error) {
        console.error("Error accepting invite:", error);
        setStatus("error");
        setMessage("An error occurred while accepting the invitation.");
      }
    };

    acceptInvite();
  }, [params.token, router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h2 className="mt-4 text-xl font-semibold">
                Processing invitation...
              </h2>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 p-2">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Success!
              </h2>
              <p className="mt-2 text-gray-600">{message}</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 p-2">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Unable to Accept Invitation
              </h2>
              <p className="mt-2 text-gray-600">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
