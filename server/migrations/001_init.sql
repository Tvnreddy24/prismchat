-- Prism Chat RAG schema (Postgres + pgvector)
-- Run: psql $DATABASE_URL -f migrations/001_init.sql
-- Or: npm run migrate  (runs this file automatically)

-- 1. Vector extension (Supabase: already available, just enable)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Documents table — one row per uploaded file (APPM vol, GO, PDF...)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  mime TEXT DEFAULT '',
  size_bytes INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready',
  chunk_count INT NOT NULL DEFAULT 0,
  error TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Chunks table — embedding per text piece (768 dims = text-embedding-004)
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  page_no INT,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Fast vector search index (HNSW cosine). Create AFTER first data load
--    if the table is empty, CREATE INDEX still works — no rows, no problem.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Helper: semantic search function used by the API.
--    Returns top-k chunks with cosine similarity score (0..1).
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  min_score FLOAT DEFAULT 0.32
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  content TEXT,
  page_no INT,
  score FLOAT,
  doc_title TEXT,
  filename TEXT,
  category TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.doc_id,
    c.content,
    c.page_no,
    1 - (c.embedding <=> query_embedding) AS score,
    d.title AS doc_title,
    d.filename,
    d.category
  FROM chunks c
  JOIN documents d ON d.id = c.doc_id
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= min_score
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
