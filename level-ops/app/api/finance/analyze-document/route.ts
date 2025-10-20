import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/finance/analyze-document
 *
 * Trigger financial document analysis via Railway FastAPI backend.
 * Accepts document_id and initiates AI-powered metric extraction.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { document_id, org_id } = body;

    if (!document_id || !org_id) {
      return NextResponse.json(
        { error: "Missing required fields: document_id, org_id" },
        { status: 400 }
      );
    }

    // Verify user has access to org (EDITOR+ role required)
    const { data: membership, error: membershipError } = await supabase
      .from("org_memberships")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    if (!["OWNER", "ADMIN", "EDITOR"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. EDITOR role required." },
        { status: 403 }
      );
    }

    // Verify document exists and belongs to org
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, file_name, file_type")
      .eq("id", document_id)
      .eq("org_id", org_id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Validate file type (XLS, XLSX, CSV only for Phase 1)
    const supportedTypes = ["xlsx", "xls", "csv"];
    const fileType = document.file_name.split(".").pop()?.toLowerCase();

    if (!fileType || !supportedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${fileType}. Supported types: ${supportedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Call Railway FastAPI backend to start analysis
    const fastApiUrl = process.env.FASTAPI_URL;
    if (!fastApiUrl) {
      throw new Error("FASTAPI_URL environment variable not set");
    }

    const analysisResponse = await fetch(
      `${fastApiUrl}/analyze-financial-document`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id,
          org_id,
          user_id: user.id,
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      throw new Error(
        `FastAPI error (${analysisResponse.status}): ${errorText}`
      );
    }

    const analysisResult = await analysisResponse.json();

    return NextResponse.json({
      success: true,
      analysis_id: analysisResult.analysis_id,
      status: analysisResult.status,
      message: "Financial analysis started successfully",
    });
  } catch (error) {
    console.error("Financial analysis API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
