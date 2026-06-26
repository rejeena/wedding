require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.md':   'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);

        if (!process.env.OPENAI_API_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }));
          return;
        }

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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: data.choices[0].message.content }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static file serving
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✨ AI Wedding Studio server running at http://localhost:${PORT}\n`);
});
