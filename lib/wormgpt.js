'use strict';

const fetch = require('node-fetch');
const { randomUUID } = require('crypto');

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

async function askUncensored(question) {
  const initRes = await fetch('https://uncensored.chat/', {
  compress: false,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept-Encoding': 'identity'
  }
});
  const html = await initRes.text();
  const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  let cookies = '';
  if (typeof initRes.headers.getSetCookie === 'function') {
    cookies = initRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  } else {
    const setCookie = initRes.headers.get('set-cookie');
    if (setCookie) cookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
  }

  const startRes = await fetch('https://uncensored.chat/chats/start', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': cookies
    },
    body: JSON.stringify({ character_id: 87, message: question, think_mode: false, api_version: 'v1' })
  });

  const location = startRes.headers.get('location');
  if (!location) throw new Error('Failed to create chat session');
  const chatId = location.split('/').pop();

  const streamId = randomUUID().replace(/-/g, '').substring(0, 21);

  const streamRes = await fetch(`https://uncensored.chat/chats/${chatId}/stream`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
      'X-Stream-ID': streamId,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://uncensored.chat',
      'Referer': location,
      'Cookie': cookies
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: question, type: 'text' }],
      api_version: 'v1'
    })
  });

  const rawStream = await streamRes.text();
  let result = '';
  for (const line of rawStream.split('\n')) {
    if (line.startsWith('data: {"content":')) {
      try {
        const json = JSON.parse(line.substring(6));
        if (json.content) result += json.content;
      } catch {}
    }
  }

  return result.trim() || 'No response from AI.';
}

module.exports = { askUncensored };
