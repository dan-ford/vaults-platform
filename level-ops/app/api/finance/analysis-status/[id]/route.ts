import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/finance/analysis-status/[id]?org_id=xxx
 *
 * Get the status and results of a financial analysis.
 * Polls the financial_analyses table for current status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org_id from query params
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get("org_id");

    if (!org_id) {
      return NextResponse.json(
        { error: "Missing required parameter: org_id" },
        { status: 400 }
      );
    }

    const analysis_id = params.id;

    // Verify user has access to org
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

    // Get analysis status from database
    const { data: analysis, error: analysisError } = await supabase
      .from("financial_analyses")
      .select(
        `
        id,
        document_id,
        org_id,
        file_type,
        analysis_status,
        confidence_score,
        extracted_data,
        ai_insights,
        ai_recommendations,
        detected_issues,
        error_message,
        processing_time_ms,
        reviewed_by,
        reviewed_at,
        approved,
        snapshot_id,
        created_at,
        updated_at,
        created_by
      `
      )
      .eq("id", analysis_id)
      .eq("org_id", org_id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Return analysis data
    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis status API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
