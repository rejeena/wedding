const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { name, phone, email = '', message = '' } = req.body || {};

  if (!name?.trim() || !phone?.trim()) {
    res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Supabase 미설정 시에도 성공 응답 (배포 전 로컬 테스트용)
    console.warn('[lead] Supabase 미설정 — 리드 저장 건너뜀');
    res.status(200).json({ ok: true });
    return;
  }

  const { error } = await supabase.from('leads').insert({ name, phone, email, message });
  if (error) {
    console.error('[lead] 저장 실패:', error.message);
    res.status(500).json({ error: '저장 중 오류가 발생했습니다.' });
    return;
  }

  res.status(200).json({ ok: true });
};
