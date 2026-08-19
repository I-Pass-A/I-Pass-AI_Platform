-- ============================================================
-- Migration 002 — RAG improvements
-- Run in Supabase SQL Editor
-- Safe to run on existing data
-- ============================================================

-- 1. Add chunk_index column to curriculum_chunks
--    Stores the position of each chunk within its source document.
--    Used by neighbor expansion to fetch chunk before/after a match.
ALTER TABLE public.curriculum_chunks
  ADD COLUMN IF NOT EXISTS chunk_index integer DEFAULT 0;

-- 2. HNSW approximate nearest-neighbor index
--    Build AFTER existing data is loaded (which it is — 847 chunks).
--    Dramatically faster similarity search as the corpus grows.
--    vector_cosine_ops matches the <=> (cosine distance) operator we use.
CREATE INDEX IF NOT EXISTS curriculum_chunks_embedding_hnsw
  ON public.curriculum_chunks
  USING hnsw (embedding vector_cosine_ops);

-- 3. Composite index for neighbor expansion queries
--    Speeds up: .eq("source_document", x).in("chunk_index", [i-1, i+1])
CREATE INDEX IF NOT EXISTS curriculum_chunks_source_chunk_idx
  ON public.curriculum_chunks (source_document, chunk_index);

-- 4. Update match_chunks function to expose chunk_index in results
--    Drop first because we're changing the return type (adding chunk_index column)
DROP FUNCTION IF EXISTS public.match_chunks(vector, float, int, text, text, text);

CREATE OR REPLACE FUNCTION public.match_chunks (
  query_embedding  vector(1536),
  match_threshold  float,
  match_count      int,
  filter_subject   text,
  filter_grade     text,
  filter_language  text
) RETURNS TABLE (
  id              bigint,
  subject         text,
  topic           text,
  grade           text,
  language        text,
  source_document text,
  content         text,
  chunk_index     integer,
  similarity      float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.subject,
    cc.topic,
    cc.grade,
    cc.language,
    cc.source_document,
    cc.content,
    cc.chunk_index,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM public.curriculum_chunks cc
  WHERE cc.subject       = filter_subject
    AND cc.grade         = filter_grade
    AND cc.language      = filter_language
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Backfill chunk_index for existing chunks
--    Groups existing chunks by source_document and assigns sequential
--    indexes ordered by their insertion time (id).
--    New uploads will set chunk_index explicitly from the upload script.
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY source_document
      ORDER BY id
    ) - 1 AS idx
  FROM public.curriculum_chunks
)
UPDATE public.curriculum_chunks cc
SET chunk_index = numbered.idx
FROM numbered
WHERE cc.id = numbered.id;
