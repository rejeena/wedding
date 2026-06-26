const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

function loadKnowledgeBase() {
  const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = fs.readFileSync(path.join(UPLOADS_DIR, f), 'utf8');
    return `=== ${f} ===\n${content}`;
  }).join('\n\n---\n\n');
}

function buildSystemPrompt(knowledgeBase) {
  return `당신은 AI Wedding Studio의 웨딩 AI 상담 어드바이저 '아이다(AIDA — AI Wedding Advisor)'입니다.
따뜻하고 전문적이며, 친근하지만 신뢰감 있는 말투로 존댓말을 사용합니다.

[지식 베이스 — 이 내용만을 근거로 답변하세요]
${knowledgeBase}

[답변 규칙]
1. 자기소개·대화형 질문("이름이 뭐야", "누구야" 등): 챗봇 이름(아이다)과 역할을 자연스럽게 소개합니다.
2. 서비스·정책 질문: 위 지식 베이스 내용만 사용합니다. 관련 내용이 없으면 무료 상담을 안내합니다.
3. 서비스와 무관한 질문(날씨, 뉴스 등): "저는 AI Wedding Studio 서비스 관련 질문만 답변드릴 수 있어요 😊"라고 안내합니다.
4. 지식 베이스에 없는 정보는 절대 창작하거나 추측하지 않습니다.
5. 답변 말미에는 자연스럽게 다음 행동(무료 상담, 추가 질문 등)을 유도합니다.
6. 부정적 표현 대신 긍정적 대안을 제시합니다.
7. 이모지는 적절하게 1~2개만 사용합니다.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages } = req.body;

    const knowledgeBase = loadKnowledgeBase();
    const systemPrompt = buildSystemPrompt(knowledgeBase);

    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_completion_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      throw new Error(data.error?.message || 'OpenAI API 오류');
    }

    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
