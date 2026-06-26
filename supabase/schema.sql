-- Supabase SQL Editor에서 실행하세요.

-- ── pgvector 확장 ───────────────────────────────────────────────
create extension if not exists vector;

-- ── documents (RAG 벡터 저장소) ────────────────────────────────
create table if not exists documents (
  id          bigserial primary key,
  content     text        not null,
  embedding   vector(1536),
  source      text,
  chunk_index int,
  created_at  timestamptz default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 유사도 검색 함수
create or replace function match_documents(
  query_embedding   vector(1536),
  match_count       int     default 5,
  similarity_threshold float default 0.3
)
returns table (
  id         bigint,
  content    text,
  source     text,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.source,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) > similarity_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ── leads (상담 신청) ────────────────────────────────────────────
create table if not exists leads (
  id         bigserial primary key,
  name       text,
  phone      text,
  email      text,
  message    text,
  created_at timestamptz default now()
);

-- ── chat_logs (대화 기록) ────────────────────────────────────────
create table if not exists chat_logs (
  id         bigserial primary key,
  question   text        not null,
  answer     text        not null,
  sources    text[],
  created_at timestamptz default now()
);
