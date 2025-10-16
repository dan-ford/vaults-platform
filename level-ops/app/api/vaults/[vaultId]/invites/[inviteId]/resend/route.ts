import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ vaultId: string; inviteId: string }>;
}

const RATE_LIMIT_MINUTES = 10; // Minimum time between resends

// POST /api/vaults/:vaultId/invites/:inviteId/resend - Resend invite email
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { vaultId, inviteId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is vault admin
    const { data: member } = await supabase
      .from("vault_members")
      .select("role")
      .eq("vault_id", vaultId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from("vault_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("vault_id", vaultId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if invite is still pending
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot resend ${invite.status} invite` },
        { status: 400 },
      );
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 400 },
      );
    }

    // Rate limit check: ensure at least RATE_LIMIT_MINUTES have passed since last send
    const lastSentAt = new Date(invite.last_sent_at);
    const now = new Date();
    const minutesSinceLastSend =
      (now.getTime() - lastSentAt.getTime()) / 1000 / 60;

    if (minutesSinceLastSend < RATE_LIMIT_MINUTES) {
      const remainingMinutes = Math.ceil(
        RATE_LIMIT_MINUTES - minutesSinceLastSend,
      );
      return NextResponse.json(
        {
          error: `Please wait ${remainingMinutes} minute(s) before resending`,
        },
        { status: 429 },
      );
    }

    // Get vault details
    const { data: vault } = await supabase
      .from("vaults")
      .select("name")
      .eq("id", vaultId)
      .single();

    if (!vault) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", invite.inviter_id)
      .single();

    const inviterName =
      inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : "A team member";

    // Calculate hours until expiry
    const expiresAt = new Date(invite.expires_at);
    const hoursUntilExpiry = Math.max(
      1,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60),
    );

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${invite.token}`;

    // Call Edge Function to send email
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`;
    const { data: authData } = await supabase.auth.getSession();

    const emailResponse = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.session?.access_token}`,
      },
      body: JSON.stringify({
        vaultName: vault.name,
        inviterName,
        inviteeEmail: invite.invitee_email,
        inviteUrl,
        expiryHours: hoursUntilExpiry,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send invite email:", errorText);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    // Update last_sent_at timestamp
    const { error: updateError } = await supabase
      .from("vault_invites")
      .update({ last_sent_at: now.toISOString() })
      .eq("id", inviteId);

    if (updateError) {
      console.error("Failed to update last_sent_at:", updateError);
    }

    return NextResponse.json({ success: true, message: "Invite resent" });
  } catch (error) {
    console.error("Error resending invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
