
# RAG Implementation Plan: Tenant-Isolated Document Knowledge Base (Updated)

**Owner:** Level Ops
**Last updated:** 2025-10-05
**Status:** Approved for implementation

## 0) What’s new vs the previous plan (at a glance)

* **Retrieval quality:** adds **hybrid search** (vector + BM25), **MMR diversification**, **neighbor windowing**, and optional **cross-encoder re-rank** for precision.
* **Ingestion fidelity:** layout-aware extraction, **dedup by content hash**, partial re-embedding, and table-aware chunking.
* **Schema:** adds `page`, `content_sha256`, `token_count`, `heading`, `section_path`, `lang`, `tsv`, `version`, and **partial HNSW** index.
* **Security:** tighter RLS using JWT tenant claim; keeps functions **SECURITY INVOKER**.
* **Ops:** tracing, audit logs, golden-set evals, RAGAS metrics, semantic caching, and cost metering per tenant.
* **Scalability:** partitioning strategy, neighbor fetch indexes, rate limits/backpressure.
* **UX:** inline citations with doc/page/chunk, “Why these sources?” rationale.

---

## 1) Executive Summary

We will equip CopilotKit/Level Ops with high-precision, tenant-isolated RAG. The pipeline ingests documents, extracts structure, chunks intelligently, embeds (OpenAI `text-embedding-3-small` by default), and stores into Postgres with pgvector under strict RLS. Retrieval uses **hybrid fusion** (vector similarity + BM25), **MMR**, **neighbor windows**, and optional **re-ranking** for best-in-class answer grounding. All calls, costs, and sources are auditable per tenant.

---

## 2) Current State (brief)

* **Upload & extract:** PDFs via `pdfjs-dist`; full text stored in `documents.text_content`.
* **RLS:** table-level RLS by `tenant_id`.
* **Limitations:** no embeddings; no semantic search; token overload when sending full docs; weak precision/latency.

---

## 3) Solution Architecture

**Core stack**

* **DB:** Postgres + pgvector (ANN via HNSW), full-text search (tsvector).
* **Embeddings:** OpenAI `text-embedding-3-small` (1536-d), swappable later.
* **Frameworks:** LangGraph (agent graph), LangChain (retriever tool), CopilotKit (UI/agent bridge).
* **Services:** FastAPI Python backend + worker queue.

**High-level flow**

1. **Ingest:** extract text + structure → smart chunk → hash → enqueue.
2. **Embed:** idempotent worker computes embeddings, token counts, TSV, metadata.
3. **Retrieve:** hybrid (vector+BM25) → MMR → neighbor window → optional re-rank → top-k.
4. **Synthesize:** constrained prompt citing only retrieved spans (doc/page/chunk).
5. **Govern:** prompt-injection scrub, PII/tenant checks, audit + cost.

---

## 4) Database Schema & Security

### 4.1 Enable pgvector (if not already)

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

### 4.2 Chunks table

```sql
-- Base table
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),           -- text-embedding-3-small dims
  metadata JSONB DEFAULT '{}',
  page INTEGER,
  content_sha256 TEXT,
  token_count INTEGER,
  heading TEXT,
  section_path TEXT,
  lang TEXT,
  tsv TSVECTOR,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- Partial ANN index only on embedded rows
CREATE INDEX IF NOT EXISTS idx_chunks_hnsw
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Full-text index
CREATE INDEX IF NOT EXISTS idx_chunks_tsv
ON document_chunks USING GIN (tsv);

-- Neighbor fetch & scoping
CREATE INDEX IF NOT EXISTS idx_chunks_tenant_doc_chunk
ON document_chunks(tenant_id, document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id
ON document_chunks(tenant_id);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
```

### 4.3 RLS (deny-by-default + explicit tenant binding)

```sql
-- SELECT within tenant
CREATE POLICY "read_own_tenant_chunks"
ON document_chunks FOR SELECT TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
);

-- INSERT within tenant (prevents spoofing)
CREATE POLICY "insert_own_tenant_chunks"
ON document_chunks FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
);

-- UPDATE restricted as needed (optional)
CREATE POLICY "update_own_tenant_chunks"
ON document_chunks FOR UPDATE TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
);
```

> **Note:** All SQL functions remain **SECURITY INVOKER** so RLS applies. Pass `tenant_id` explicitly in queries/functions.

### 4.4 Hybrid search function (fusion of vector + BM25)

```sql
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  query_embedding VECTOR(1536),
  query_text TEXT,
  tenant UUID,
  k INT DEFAULT 20
)
RETURNS TABLE (
  id UUID, document_id UUID, document_name TEXT,
  chunk_index INT, page INT, content TEXT,
  sim FLOAT, bm25 FLOAT, fused FLOAT
)
LANGUAGE sql STABLE AS $$
  WITH vec AS (
    SELECT dc.*, 1 - (dc.embedding <=> query_embedding) AS sim
    FROM document_chunks dc
    WHERE dc.tenant_id = tenant AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT k*5
  ),
  txt AS (
    SELECT dc.id, ts_rank(dc.tsv, plainto_tsquery(query_text)) AS bm25
    FROM document_chunks dc
    WHERE dc.tenant_id = tenant AND dc.tsv @@ plainto_tsquery(query_text)
    ORDER BY bm25 DESC
    LIMIT k*5
  ),
  merged AS (
    SELECT v.id, v.document_id, v.chunk_index, v.page, v.content, v.sim,
           COALESCE(t.bm25, 0) AS bm25
    FROM vec v LEFT JOIN txt t USING (id)
  )
  SELECT dc.id, dc.document_id, d.name AS document_name,
         dc.chunk_index, dc.page, dc.content,
         m.sim, m.bm25,
         (0.6*m.sim + 0.4*m.bm25) AS fused
  FROM merged m
  JOIN document_chunks dc ON dc.id = m.id
  JOIN documents d ON d.id = dc.document_id
  ORDER BY fused DESC
  LIMIT k;
$$;
```

---

## 5) Ingestion & Embedding

**Extractor**

* Primary: `pdfjs-dist` | Alternative: **PyMuPDF** for reliable reading order.
* Fallback OCR: Tesseract when no text layer.
* Capture: `page`, detected `heading`, `section_path`, `lang`.

**Chunking**

* Paragraph/heading-aware first; then `RecursiveCharacterTextSplitter` ~800–1,000 chars with ~120 overlap.
* Don’t break tables (simple heuristic: lines with ≥2 delimiters stay together).
* Record `token_count` per chunk for budgeting.

**Dedup & versions**

* Compute `content_sha256` per chunk; **skip embedding** if already present.
* On re-upload: bump `version`; upsert only changed chunks.

**Embedding worker**

* Idempotent, rate-limited, per-tenant concurrency caps.
* Populates `embedding`, `tsv` (`to_tsvector(language, content)` where supported).
* Enqueues “ingestion complete” event for UX progress.

---

## 6) Retrieval Strategy

1. **Hybrid pre-selection:** call `search_chunks_hybrid` with query embedding + text.
2. **MMR diversification:** reduce redundancy; target 12 candidates.
3. **Neighbor window:** fetch ±1 adjacent chunks per hit (weighted decay).
4. **Re-rank (optional):** cross-encoder or LLM scoring top 15 → pick top 5.
5. **Context cap:** feed **max 3–5 chunks** into synthesis to stay under token budgets.
6. **Citations:** include `(document_name, page, chunk_index)` + deep link.

---

## 7) Agent Graph (LangGraph)

* **Ingestion Agent:** MIME checks → extract → chunk → hash → queue.
* **Embedding Worker:** idempotent; writes embeddings/tsv; logs tokens/cost.
* **Retrieval Tool:** wraps the hybrid SQL RPC, runs MMR, neighbor windows, optional re-rank.
* **Synthesis Agent:** constrained prompt; quotes only retrieved spans; adds inline citations.
* **Governance Agent:** strips prompt-injection content from retrieved text, checks tenant/PII policy, writes audit entry.

*All tool I/O validated with **Pydantic** models.*

---

## 8) Multitenancy & Scale

* Always bind `tenant_id` **before** similarity in SQL WHERE.
* For very large tenants: **table partitioning by tenant_id** or dedicated schema.
* Index `(tenant_id, document_id, chunk_index)` for neighbor access.
* Backpressure: queue + per-tenant concurrency caps to protect system during bulk ingest.

---

## 9) Frontend Integration (CopilotKit)

* After upload, show per-doc **Processing…** with progress sourced from events.
* Remove full text from `useCopilotReadable`; keep metadata only.
* Provide **“Why these sources?”** popover listing retrieved titles and relative scores.
* Deep-link to document page/scroll position for verification.

---

## 10) Security, Privacy, Compliance

* RLS enforced for all operations; functions are **SECURITY INVOKER**.
* No client-side vector ops; all retrieval/embedding server-side.
* Audit log fields: `(tenant_id, user_id, query, retrieved_ids, model, tokens_in/out, cost, latency, timestamp)`.
* Redact PII in logs; configurable retention.
* Prompt-injection guard on retrieved text (strip “ignore all”-style strings).

---

## 11) Observability & Evaluations

* **Tracing:** OpenTelemetry + LangSmith (or internal) from request → retrieval → answer.
* **Metrics:** p50/p95 latency, hit-rate, token usage, cost per tenant, top docs.
* **RAG evals:** maintain **golden Q/A** sets per tenant; run in CI. Track RAGAS: faithfulness, answer relevancy, context precision/recall.
* **Regression gates:** block deploy if eval drops > X%.

---

## 12) Cost, Caching, and Limits

* **Dedup cache:** `content_sha256 → embedding` to skip re-embeds.
* **Semantic answer cache:** key `(tenant, normalized_query)` with vector look-up for near-duplicates.
* **Budget:** configurable per tenant (docs/day, tokens/day).
* **Cost meter:** persist token & $ per tenant for transparency.

*(Embed pricing fluctuates; compute effective $ dynamically: `cost = tokens * unit_price` and display per document/tenant dashboards.)*

---

## 13) Rollout Plan (5 steps)

* **S1 – Infra:** extensions, tables, RLS, indexes, hybrid function.
* **S2 – Backend:** ingestion service, worker, RPC wrapper, Pydantic DTOs.
* **S3 – Frontend:** upload progress, retrieval tool wiring, citations UI.
* **S4 – Testing:** unit/integration/E2E + golden-set evals; load tests.
* **S5 – Deploy:** staging → UAT → production; dashboards & alerts live.

---

## 14) Success Criteria

**Functional**

* Semantic answers with inline source citations.
* Auto-embedding on upload; delta re-embedding on edits.
* Strict tenant isolation verified by tests.

**Performance**

* Retrieval (DB) p95 < 500 ms.
* End-to-end answer p95 < 2.5 s (no re-rank) / < 3.5 s (with re-rank).
* 10k+ documents/tenant supported without major regressions.

**Security**

* RLS enforced for all paths; zero cross-tenant leakage; audit integrity proven.

---

## 15) Configuration Knobs

* `HYBRID_FUSION_WEIGHTS`: default `(0.6, 0.4)` for (sim, bm25).
* `TOP_K_PRE`: 100; `TOP_K_MMR`: 12; `TOP_K_FINAL`: 5.
* `NEIGHBOR_WINDOW`: ±1.
* `RERANK_ENABLED`: per-tenant flag (on/off).
* `EMBED_MODEL`: default `text-embedding-3-small`.

---

## 16) Minimal Retriever Sketch (TypeScript)

```ts
type Retrieved = {
  id: string; document_id: string; document_name: string;
  chunk_index: number; page: number | null; content: string; score: number;
};

export async function retrieve({ tenantId, query, k = 8, rerank = true }): Promise<Retrieved[]> {
  const emb = await embed(query); // cached by hash+model
  const rows = await db.rpc('search_chunks_hybrid', {
    query_embedding: emb, query_text: query, tenant: tenantId, k: 20
  });

  const mmr = maximalMarginalRelevance(query, rows, 0.6, 12);
  const withNeighbors = await addNeighborWindows(mmr, { before: 1, after: 1 });
  let candidates = withNeighbors.slice(0, 15);

  if (rerank) candidates = await crossEncoderRerank(query, candidates).then(r => r.slice(0, 5));

  return candidates.map((r) => ({
    id: r.id, document_id: r.document_id, document_name: r.document_name,
    chunk_index: r.chunk_index, page: r.page ?? null, content: r.content, score: r.fused ?? r.sim
  }));
}
```




