import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ vaultId: string }>;
}

// GET /api/vaults/:vaultId/invites - List invites for a vault
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { vaultId } = await params;
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

    // Get all invites for this vault
    const { data: invites, error } = await supabase
      .from("vault_invites")
      .select("*")
      .eq("vault_id", vaultId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/vaults/:vaultId/invites - Create a new invite
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { vaultId } = await params;
    const body = await request.json();
    const { inviteeEmail, role = "member", expiryHours = 72 } = body;

    if (!inviteeEmail) {
      return NextResponse.json(
        { error: "inviteeEmail is required" },
        { status: 400 },
      );
    }

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
      .eq("user_id", user.id)
      .single();

    const inviterName =
      inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : user.email || "A team member";

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from("vault_invites")
      .insert({
        vault_id: vaultId,
        inviter_id: user.id,
        invitee_email: inviteeEmail,
        token,
        role,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

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
        inviteeEmail,
        inviteUrl,
        expiryHours,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Failed to send invite email:", await emailResponse.text());
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
