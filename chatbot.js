(function () {
  'use strict';

  const ACCENT = '#D4A5A5';
  const ACCENT_DARK = '#B48B8B';
  const BG = '#FAF7F4';
  const TEXT = '#2C2C2C';
  const GOLD = '#C9A96E';
  const MUTED = '#8C8C8C';
  const WELCOME = '안녕하세요! 저는 AI Wedding Studio의 웨딩 상담 어드바이저 아이다예요 💍\n궁금하신 서비스나 웨딩 이미지에 대해 편하게 물어보세요!';
  const MAX_HISTORY = 10;

  let history = [];
  let isOpen = false;
  let isLoading = false;

  // ── Inject styles ───────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #aiws-chat-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${ACCENT};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(212,165,165,.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .25s, transform .2s, box-shadow .25s;
      outline: none;
    }
    #aiws-chat-btn:hover {
      background: ${ACCENT_DARK};
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(212,165,165,.55);
    }
    #aiws-chat-btn svg { display: block; }

    #aiws-chat-window {
      position: fixed;
      bottom: 96px;
      right: 28px;
      z-index: 9998;
      width: 360px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: ${BG};
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(44,44,44,.14);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(16px) scale(.97);
      opacity: 0;
      pointer-events: none;
      transition: transform .28s cubic-bezier(.16,.84,.44,1), opacity .22s ease;
    }
    #aiws-chat-window.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }

    #aiws-chat-header {
      background: ${ACCENT};
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    #aiws-chat-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #aiws-chat-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255,255,255,.28);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    #aiws-chat-title {
      font-family: Pretendard, 'Noto Sans KR', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      line-height: 1.2;
    }
    #aiws-chat-subtitle {
      font-family: Pretendard, 'Noto Sans KR', sans-serif;
      font-size: 11px;
      color: rgba(255,255,255,.8);
      margin-top: 1px;
    }
    #aiws-chat-close {
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(255,255,255,.85);
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: color .2s;
      outline: none;
    }
    #aiws-chat-close:hover { color: #fff; }

    #aiws-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    #aiws-chat-messages::-webkit-scrollbar { width: 4px; }
    #aiws-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #aiws-chat-messages::-webkit-scrollbar-thumb { background: rgba(44,44,44,.12); border-radius: 4px; }

    .aiws-msg {
      max-width: 82%;
      padding: 10px 13px;
      border-radius: 12px;
      font-family: Pretendard, 'Noto Sans KR', sans-serif;
      font-size: 13.5px;
      line-height: 1.6;
      color: ${TEXT};
      white-space: pre-wrap;
      word-break: break-word;
    }
    .aiws-msg.bot {
      align-self: flex-start;
      background: #fff;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 6px rgba(44,44,44,.07);
    }
    .aiws-msg.user {
      align-self: flex-end;
      background: ${ACCENT};
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .aiws-msg.error {
      align-self: flex-start;
      background: #fff3f3;
      border: 1px solid #f8d0d0;
      color: #b94a48;
      font-size: 13px;
    }

    .aiws-dots {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 14px;
    }
    .aiws-dots span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${ACCENT};
      animation: aiws-dot-bounce .9s ease-in-out infinite;
    }
    .aiws-dots span:nth-child(2) { animation-delay: .18s; }
    .aiws-dots span:nth-child(3) { animation-delay: .36s; }
    @keyframes aiws-dot-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: .4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    #aiws-chat-input-area {
      padding: 10px 12px;
      border-top: 1px solid rgba(44,44,44,.07);
      display: flex;
      gap: 8px;
      align-items: flex-end;
      background: ${BG};
      flex-shrink: 0;
    }
    #aiws-chat-input {
      flex: 1;
      resize: none;
      border: 1px solid rgba(44,44,44,.12);
      border-radius: 10px;
      padding: 9px 12px;
      font-family: Pretendard, 'Noto Sans KR', sans-serif;
      font-size: 13.5px;
      color: ${TEXT};
      background: #fff;
      outline: none;
      line-height: 1.5;
      max-height: 96px;
      overflow-y: auto;
      transition: border-color .2s;
    }
    #aiws-chat-input:focus { border-color: ${ACCENT}; }
    #aiws-chat-input::placeholder { color: ${MUTED}; }
    #aiws-chat-send {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: ${ACCENT};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background .2s;
      outline: none;
    }
    #aiws-chat-send:hover:not(:disabled) { background: ${ACCENT_DARK}; }
    #aiws-chat-send:disabled { opacity: .5; cursor: default; }

    @media (max-width: 480px) {
      #aiws-chat-window {
        right: 20px;
        bottom: 88px;
        width: calc(100vw - 40px);
      }
      #aiws-chat-btn {
        right: 20px;
        bottom: 20px;
      }
    }
  `;
  document.head.appendChild(style);

  // ── DOM ─────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'aiws-chat-btn';
  btn.setAttribute('aria-label', '상담 챗봇 열기');
  btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`;

  const win = document.createElement('div');
  win.id = 'aiws-chat-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', '웨딩 상담 채팅');
  win.innerHTML = `
    <div id="aiws-chat-header">
      <div id="aiws-chat-header-info">
        <div id="aiws-chat-avatar">💍</div>
        <div>
          <div id="aiws-chat-title">아이다 (AIDA)</div>
          <div id="aiws-chat-subtitle">AI Wedding Studio 상담 어드바이저</div>
        </div>
      </div>
      <button id="aiws-chat-close" aria-label="채팅창 닫기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div id="aiws-chat-messages"></div>
    <div id="aiws-chat-input-area">
      <textarea id="aiws-chat-input" placeholder="궁금하신 점을 입력하세요…" rows="1"></textarea>
      <button id="aiws-chat-send" aria-label="전송">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  const messagesEl = win.querySelector('#aiws-chat-messages');
  const inputEl = win.querySelector('#aiws-chat-input');
  const sendBtn = win.querySelector('#aiws-chat-send');
  const closeBtn = win.querySelector('#aiws-chat-close');

  // ── Helpers ─────────────────────────────────────────────────────
  function appendMessage(text, role) {
    const el = document.createElement('div');
    el.className = `aiws-msg ${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function showLoading() {
    const el = document.createElement('div');
    el.className = 'aiws-msg bot aiws-loading';
    el.innerHTML = `<div class="aiws-dots"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function removeLoading(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function autoResizeInput() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px';
  }

  // ── Open / Close ─────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    setTimeout(() => inputEl.focus(), 300);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`;
  }

  btn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── Send message ─────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';

    appendMessage(text, 'user');

    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);

    const loadingEl = showLoading();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      removeLoading(loadingEl);

      if (!res.ok || data.error) {
        appendMessage('죄송해요, 잠시 오류가 생겼어요. 잠시 후 다시 시도해 주세요.', 'error');
      } else {
        appendMessage(data.reply, 'bot');
        history.push({ role: 'assistant', content: data.reply });
        if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);
      }
    } catch {
      removeLoading(loadingEl);
      appendMessage('네트워크 오류가 발생했어요. 인터넷 연결을 확인해 주세요.', 'error');
    }

    isLoading = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('input', autoResizeInput);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ── Welcome message (1s delay) ───────────────────────────────────
  setTimeout(() => {
    appendMessage(WELCOME, 'bot');
  }, 1000);

})();
