-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create document_chunks table for RAG
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding extensions.vector(1536),
  token_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate chunks
  UNIQUE(document_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_org_id ON public.document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Full-text search index for hybrid search
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts ON public.document_chunks USING gin(to_tsvector('english', content));

-- Enable Row Level Security
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_chunks
CREATE POLICY "Users can view chunks from their org documents"
  ON public.document_chunks
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their org documents"
  ON public.document_chunks
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks from their org documents"
  ON public.document_chunks
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks from their org documents"
  ON public.document_chunks
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Function for hybrid search (vector similarity + full-text search)
CREATE OR REPLACE FUNCTION public.search_chunks_hybrid(
  query_embedding extensions.vector(1536),
  query_text TEXT,
  match_org_id UUID,
  match_count INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  ts_rank FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) AS ts_rank,
    -- Weighted combined score: 70% vector similarity, 30% text relevance
    (0.7 * (1 - (dc.embedding <=> query_embedding))) +
    (0.3 * ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', query_text))) AS combined_score
  FROM public.document_chunks dc
  WHERE dc.org_id = match_org_id
    AND (1 - (dc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Enable realtime for document_chunks
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_chunks;
