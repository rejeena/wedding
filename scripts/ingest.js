#!/usr/bin/env node
// 실행: node scripts/ingest.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs   = require('fs');
const path = require('path');
const { getSupabase }      = require('../lib/supabase');
const { chunkText, embed } = require('../lib/rag');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function ingest() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌  SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다.');
    process.exit(1);
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.md'));
  console.log(`\n📂  ${files.length}개 문서 처리 시작\n`);

  // 기존 데이터 전체 삭제 후 재적재
  const { error: delErr } = await supabase.from('documents').delete().neq('id', 0);
  if (delErr) { console.error('기존 데이터 삭제 실패:', delErr.message); process.exit(1); }

  let total = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(UPLOADS_DIR, file), 'utf8');
    const chunks  = chunkText(content);
    console.log(`  ${file}: ${chunks.length}개 청크`);

    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`    [${i + 1}/${chunks.length}] 임베딩 중...`);
      try {
        const embedding = await embed(chunks[i]);
        const { error } = await supabase.from('documents').insert({
          content:     chunks[i],
          embedding,
          source:      file,
          chunk_index: i,
        });
        if (error) throw error;
        process.stdout.write(' ✓\n');
      } catch (err) {
        process.stdout.write(` ❌ ${err.message}\n`);
      }
    }
    total += chunks.length;
  }

  console.log(`\n✅  완료: 총 ${total}개 청크 Supabase에 저장\n`);
}

ingest().catch(err => { console.error(err); process.exit(1); });
