import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Seal Secret API Route
 *
 * This route seals a secret by:
 * 1. Creating a canonical JSON representation of the content
 * 2. Computing a SHA-256 hash
 * 3. Obtaining an RFC 3161 timestamp
 * 4. Creating an immutable version record
 * 5. Updating the secret status to 'sealed'
 * 6. Logging to the audit trail
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { secretId, contentMarkdown, contentJson, files = [] } = body;

    if (!secretId || !contentMarkdown) {
      return NextResponse.json(
        { error: "Missing required fields: secretId, contentMarkdown" },
        { status: 400 }
      );
    }

    // Verify user has access to this secret
    const { data: secret, error: secretError } = await supabase
      .from("secrets")
      .select("*")
      .eq("id", secretId)
      .single();

    if (secretError || !secret) {
      return NextResponse.json(
        { error: "Secret not found" },
        { status: 404 }
      );
    }

    // Check user has permission (must be OWNER, ADMIN, or EDITOR)
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("role")
      .eq("org_id", secret.org_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !['OWNER', 'ADMIN', 'EDITOR'].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get the next version number
    const { data: existingVersions, error: versionError } = await supabase
      .from("secret_versions")
      .select("version_number")
      .eq("secret_id", secretId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersionNumber = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number + 1
      : 1;

    // Create canonical JSON (stable serialization for hashing)
    const canonicalContent = {
      secretId: secretId,
      versionNumber: nextVersionNumber,
      contentMarkdown: contentMarkdown,
      contentData: contentJson || {},
      files: files.map((f: any) => ({
        name: f.name,
        size: f.size,
        hash: f.hash,
      })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      timestamp: new Date().toISOString(),
    };

    // Compute SHA-256 hash of canonical JSON
    const canonicalString = JSON.stringify(canonicalContent, Object.keys(canonicalContent).sort());
    const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    // Get RFC 3161 timestamp from our timestamp API
    const timestampResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/secrets/timestamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hash: hash,
        secretId: secretId,
      }),
    });

    if (!timestampResponse.ok) {
      throw new Error('Failed to obtain timestamp');
    }

    const timestampData = await timestampResponse.json();

    // Log timestamp data for debugging
    console.log('Timestamp data received:', {
      hasToken: !!timestampData.timestamp?.token,
      tokenType: typeof timestampData.timestamp?.token,
      tokenLength: timestampData.timestamp?.token?.length,
      policyOid: timestampData.timestamp?.policyOid,
      serialNumber: timestampData.timestamp?.serialNumber,
    });

    // Prepare the insert data
    const insertData: any = {
      secret_id: secretId,
      vault_id: secret.vault_id,
      tenant_id: secret.tenant_id,
      org_id: secret.org_id,
      version_number: nextVersionNumber,
      content_markdown: contentMarkdown,
      content_canonical_json: canonicalContent,
      sha256_hash: hash,
      // For bytea columns, we need to pass the data as a Uint8Array
      // Convert base64 string to Uint8Array for tsa_token
      tsa_policy_oid: timestampData.timestamp.policyOid,
      tsa_serial: timestampData.timestamp.serialNumber,
      signed_by: [
        {
          userId: user.id,
          timestamp: new Date().toISOString(),
          role: membership.role,
        },
      ],
      created_by: user.id,
    };

    // Convert base64 token to Buffer for bytea field
    if (timestampData.timestamp.token) {
      const tokenBuffer = Buffer.from(timestampData.timestamp.token, 'base64');
      insertData.tsa_token = tokenBuffer;
    }

    console.log('Insert data prepared:', {
      secret_id: insertData.secret_id,
      version_number: insertData.version_number,
      has_tsa_token: !!insertData.tsa_token,
      tsa_token_length: insertData.tsa_token?.length,
      signed_by_count: insertData.signed_by.length,
    });

    // Create version record
    const { data: newVersion, error: versionInsertError } = await supabase
      .from("secret_versions")
      .insert(insertData as any)
      .select()
      .single();

    if (versionInsertError) {
      console.error('Version insert error:', versionInsertError);
      throw new Error(`Failed to create version record: ${versionInsertError.message}`);
    }

    if (!newVersion) {
      throw new Error('Failed to create version record: No data returned');
    }

    // Update secret status and current_version_id
    const { error: updateError } = await supabase
      .from("secrets")
      .update({
        status: 'sealed',
        current_version_id: newVersion.id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", secretId);

    if (updateError) {
      throw new Error('Failed to update secret status');
    }

    // Log to audit trail
    await supabase
      .from("secret_audit")
      .insert({
        secret_id: secretId,
        version_id: newVersion.id,
        vault_id: secret.vault_id,
        org_id: secret.org_id,
        actor_id: user.id,
        action: 'seal',
        metadata: {
          versionNumber: nextVersionNumber,
          hash: hash,
          timestamp: timestampData.timestamp.timestamp,
        },
      } as any);

    // Return success with seal certificate data
    return NextResponse.json({
      success: true,
      version: {
        id: newVersion.id,
        versionNumber: nextVersionNumber,
        hash: hash,
        timestamp: timestampData.timestamp.timestamp,
        tsa: timestampData.timestamp.tsa,
        serialNumber: timestampData.timestamp.serialNumber,
      },
      message: "Secret sealed successfully",
    });

  } catch (error) {
    console.error("Error sealing secret:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      {
        error: "Failed to seal secret",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
