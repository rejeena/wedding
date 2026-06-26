const fs   = require('fs');
const path = require('path');
const { getSupabase } = require('./supabase');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const CHUNK_SIZE  = 800;

// ── 청킹 ─────────────────────────────────────────────────────────
function chunkText(text, maxChars = CHUNK_SIZE) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    const t = para.trim();
    if (!t) continue;
    if (current.length + t.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = t;
    } else {
      current = current ? current + '\n\n' + t : t;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── 임베딩 ───────────────────────────────────────────────────────
async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Embedding API error');
  return data.data[0].embedding;
}

// ── 폴백: 전체 파일 주입 ──────────────────────────────────────────
function loadFullKB() {
  const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = fs.readFileSync(path.join(UPLOADS_DIR, f), 'utf8');
    return `=== ${f} ===\n${content}`;
  }).join('\n\n---\n\n');
}

// ── RAG 검색 → 컨텍스트 반환 ─────────────────────────────────────
async function getContext(question) {
  const supabase = getSupabase();
  if (!supabase) {
    return { context: loadFullKB(), sources: [], fallback: true };
  }

  try {
    const queryEmbedding = await embed(question);
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: 5,
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { context: loadFullKB(), sources: [], fallback: true };
    }

    const context = data.map(d => d.content).join('\n\n---\n\n');
    const sources = [...new Set(data.map(d => d.source))];
    return { context, sources, fallback: false };
  } catch (err) {
    console.error('[RAG] 검색 실패, 전체 KB 폴백:', err.message);
    return { context: loadFullKB(), sources: [], fallback: true };
  }
}

module.exports = { chunkText, embed, loadFullKB, getContext };
