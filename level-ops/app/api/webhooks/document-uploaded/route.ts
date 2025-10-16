import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook endpoint triggered after document upload
 * Sends document to FastAPI backend for chunking and embedding
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, org_id, tenant_id, priority = 'normal' } = body;

    console.log('[RAG Webhook] Triggered for document:', document_id);

    // Support both org_id (new) and tenant_id (backward compat)
    const orgIdToUse = org_id || tenant_id;

    if (!document_id || !orgIdToUse) {
      console.error('[RAG Webhook] Missing required fields');
      return NextResponse.json(
        { error: 'Missing document_id or org_id/tenant_id' },
        { status: 400 }
      );
    }

    // Call FastAPI backend to start ingestion
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8080';
    console.log(`[RAG Webhook] Calling FastAPI at ${fastApiUrl}/ingest`);

    const response = await fetch(`${fastApiUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id,
        org_id: orgIdToUse,
        tenant_id: orgIdToUse, // For backward compat
        priority,
        force_reembed: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[RAG Webhook] FastAPI ingestion error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to queue document for processing',
          details: errorData,
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('[RAG Webhook] Ingestion queued:', result.status);

    return NextResponse.json({
      success: true,
      status: result.status,
      message: 'Document queued for processing',
    });
  } catch (error) {
    console.error('[RAG Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
