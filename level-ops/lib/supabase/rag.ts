/**
 * RAG (Retrieval Augmented Generation) operations for document chunks
 * Provides typed wrappers for hybrid search and chunk retrieval
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Result from hybrid search combining vector similarity and BM25
 */
export interface ChunkSearchResult {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  page: number | null;
  content: string;
  sim: number; // Vector similarity score (0-1)
  bm25: number; // BM25 full-text score (normalized 0-1)
  fused: number; // Combined score using fusion weights
}

/**
 * Hybrid search using vector similarity + BM25 fusion
 *
 * @param queryEmbedding - 1536-dim vector from OpenAI text-embedding-3-small
 * @param queryText - Text query for BM25 full-text search
 * @param orgId - Organization UUID for RLS scoping
 * @param k - Number of results to return (default: 20)
 * @returns Array of ranked chunk results
 */
export async function searchChunksHybrid(
  queryEmbedding: number[],
  queryText: string,
  orgId: string,
  k: number = 20
): Promise<{ data: ChunkSearchResult[] | null; error: Error | null }> {
  const supabase = createClient();

  try {
    // Convert number array to PostgreSQL vector string format
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    const { data, error } = await supabase.rpc('search_chunks_hybrid', {
      query_embedding: embeddingString,
      query_text: queryText,
      org: orgId,
      k: k,
    } as any);

    if (error) {
      console.error('Hybrid search error:', error);

      // Handle case where no documents are accessible (RLS blocks access)
      if (error.message.includes('operator does not exist') ||
          error.message.includes('permission denied') ||
          error.code === 'PGRST116') {
        console.warn('No accessible documents found for user in this organization');
        return { data: [], error: null };
      }

      return { data: null, error: new Error(error.message) };
    }

    return { data: data as ChunkSearchResult[], error: null };
  } catch (err) {
    console.error('Unexpected error in searchChunksHybrid:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Fetch neighbor chunks (context windows) around a specific chunk
 * Useful for expanding retrieved chunks with surrounding context
 *
 * @param documentId - Document UUID
 * @param chunkIndex - Target chunk index
 * @param orgId - Organization UUID for RLS
 * @param before - Number of chunks before (default: 1)
 * @param after - Number of chunks after (default: 1)
 * @returns Array of neighbor chunks
 */
export async function fetchNeighborChunks(
  documentId: string,
  chunkIndex: number,
  orgId: string,
  before: number = 1,
  after: number = 1
): Promise<{
  data: Array<{
    id: string;
    chunk_index: number;
    content: string;
    page: number | null;
  }> | null;
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    const minIndex = Math.max(0, chunkIndex - before);
    const maxIndex = chunkIndex + after;

    const { data, error } = await supabase
      .from('document_chunks')
      .select('id, chunk_index, content, page')
      .eq('document_id', documentId)
      .eq('org_id', orgId)
      .gte('chunk_index', minIndex)
      .lte('chunk_index', maxIndex)
      .order('chunk_index', { ascending: true });

    if (error) {
      console.error('Neighbor fetch error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in fetchNeighborChunks:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Check if a document has been chunked and embedded
 *
 * @param documentId - Document UUID
 * @param orgId - Organization UUID for RLS
 * @returns Status object with chunk count and embedding status
 */
export async function getDocumentChunkStatus(
  documentId: string,
  orgId: string
): Promise<{
  data: {
    total_chunks: number;
    embedded_chunks: number;
    is_fully_embedded: boolean;
  } | null;
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id, embedding')
      .eq('document_id', documentId)
      .eq('org_id', orgId);

    if (error) {
      console.error('Chunk status error:', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: { total_chunks: 0, embedded_chunks: 0, is_fully_embedded: false }, error: null };
    }

    const total_chunks = data.length;
    const embedded_chunks = data.filter((chunk: { id: string; embedding: string | null }) => chunk.embedding !== null).length;

    return {
      data: {
        total_chunks,
        embedded_chunks,
        is_fully_embedded: total_chunks > 0 && embedded_chunks === total_chunks,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error in getDocumentChunkStatus:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Delete all chunks for a document (cascade on document deletion should handle this)
 * Only use this for manual cleanup or re-embedding
 *
 * @param documentId - Document UUID
 * @param orgId - Organization UUID for RLS
 * @returns Success status
 */
export async function deleteDocumentChunks(
  documentId: string,
  orgId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('org_id', orgId);

    if (error) {
      console.error('Delete chunks error:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in deleteDocumentChunks:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
