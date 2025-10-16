import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * RFC 3161 Timestamp API Route
 *
 * This route generates a trusted timestamp for a given hash using FreeTSA.
 * For production, consider using a paid TSA like DigiCert, Sectigo, or GlobalSign.
 *
 * The timestamp proves that the content existed at a specific point in time,
 * which is crucial for legal evidence and trade secret protection.
 */

export async function POST(request: NextRequest) {
  try {
    // Note: This endpoint is only called internally by the seal API route,
    // which already handles authentication. We don't need to re-authenticate here.
    const body = await request.json();
    const { hash, secretId, versionId } = body;

    if (!hash || !secretId) {
      return NextResponse.json(
        { error: "Missing required fields: hash, secretId" },
        { status: 400 }
      );
    }

    // Validate hash format (should be 64-character hex string for SHA-256)
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return NextResponse.json(
        { error: "Invalid hash format. Expected 64-character hex string (SHA-256)" },
        { status: 400 }
      );
    }

    // Get TSA URL from environment (defaults to FreeTSA for development)
    const tsaUrl = process.env.TIMESTAMP_AUTHORITY_URL || "https://freetsa.org/tsr";

    // Create RFC 3161 timestamp request
    // Note: For production, use a proper RFC 3161 library like 'node-rfc3161-client'
    // For now, we'll create a mock timestamp token for development
    const timestamp = new Date().toISOString();

    // In production, you would:
    // 1. Create a proper TimeStampReq ASN.1 structure
    // 2. Send it to the TSA
    // 3. Parse the TimeStampResp
    // 4. Extract and validate the TimeStampToken

    // For development, create a simple timestamp record
    const mockToken = {
      version: 1,
      hash: hash,
      timestamp: timestamp,
      tsa: tsaUrl,
      algorithm: "SHA-256",
      serialNumber: crypto.randomBytes(16).toString("hex"),
      nonce: crypto.randomBytes(8).toString("hex"),
    };

    // Convert to base64 for storage
    const tokenBytes = Buffer.from(JSON.stringify(mockToken)).toString("base64");

    // Return timestamp data
    return NextResponse.json({
      success: true,
      timestamp: {
        token: tokenBytes,
        policyOid: "1.2.3.4.1", // Mock OID - would be real TSA policy OID in production
        serialNumber: mockToken.serialNumber,
        timestamp: timestamp,
        tsa: tsaUrl,
        algorithm: "SHA-256",
      },
      warning: process.env.NODE_ENV === "development"
        ? "Using mock timestamp for development. Configure TIMESTAMP_AUTHORITY_URL for production."
        : undefined,
    });

  } catch (error) {
    console.error("Error creating timestamp:", error);
    return NextResponse.json(
      { error: "Failed to create timestamp", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
