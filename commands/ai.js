/**
 * commands/ai.js
 * ---------------
 * AI commands: gemini, groq, gpt (groq), dall (pollinations), upscale (pollinations)
 */

const https = require('https');
const http = require('http');

require('dotenv').config();

const GEMINI_KEY = process.env.GEMINI_KEY;
const GROQ_KEY = process.env.GROQ_KEY;
// ── Helper: HTTPS POST ────────────────────────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ error: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Helper: Download image buffer from URL ────────────────────────────────────
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = [

  // ── GEMINI ──────────────────────────────────────────────────────────────────
  {
    name: 'gemini',
    description: 'Ask Google Gemini AI. Usage: .gemini your question',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const prompt = args.join(' ');
      if (!prompt) return sock.sendMessage(jid, { text: '❌ Usage: .gemini your question' }, { quoted: msg });

      await sock.sendMessage(jid, { text: '🤖 Thinking...' }, { quoted: msg });

      try {
        const res = await httpsPost(
          'generativelanguage.googleapis.com',
          `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
          { 'Content-Type': 'application/json' },
          { contents: [{ parts: [{ text: prompt }] }] }
        );

        const reply = res?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) throw new Error('No response');

        await sock.sendMessage(jid, {
          text: `🤖 *Gemini AI*\n\n${reply}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Gemini error: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── GROQ ────────────────────────────────────────────────────────────────────
  {
    name: 'groq',
    description: 'Ask Groq AI (llama). Usage: .groq your question',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const prompt = args.join(' ');
      if (!prompt) return sock.sendMessage(jid, { text: '❌ Usage: .groq your question' }, { quoted: msg });

      await sock.sendMessage(jid, { text: '⚡ Groq is thinking...' }, { quoted: msg });

      try {
        const res = await httpsPost(
          'api.groq.com',
          '/openai/v1/chat/completions',
          { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }
        );

        const reply = res?.choices?.[0]?.message?.content;
        if (!reply) throw new Error('No response');

        await sock.sendMessage(jid, {
          text: `⚡ *Groq AI*\n\n${reply}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Groq error: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── GPT (uses Groq under the hood — free) ───────────────────────────────────
  {
    name: 'gpt',
    description: 'Ask GPT-style AI. Usage: .gpt your question',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const prompt = args.join(' ');
      if (!prompt) return sock.sendMessage(jid, { text: '❌ Usage: .gpt your question' }, { quoted: msg });

      await sock.sendMessage(jid, { text: '🧠 GPT is thinking...' }, { quoted: msg });

      try {
        const res = await httpsPost(
          'api.groq.com',
          '/openai/v1/chat/completions',
          { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }
        );

        const reply = res?.choices?.[0]?.message?.content;
        if (!reply) throw new Error('No response');

        await sock.sendMessage(jid, {
          text: `🧠 *GPT AI*\n\n${reply}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ GPT error: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── DALL (Image generation via Pollinations — free, no key) ─────────────────
  {
    name: 'dall',
    description: 'Generate AI image. Usage: .dall your prompt',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const prompt = args.join(' ');
      if (!prompt) return sock.sendMessage(jid, { text: '❌ Usage: .dall your image prompt' }, { quoted: msg });

      await sock.sendMessage(jid, { text: '🎨 Generating image...' }, { quoted: msg });

      try {
        const encoded = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true`;
        const buffer = await downloadImage(url);

        await sock.sendMessage(jid, {
          image: buffer,
          caption: `🎨 *AI Image*\n📝 Prompt: ${prompt}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Image generation error: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── BING (uses Gemini — free) ────────────────────────────────────────────────
  {
    name: 'bing',
    description: 'Ask Bing-style AI. Usage: .bing your question',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const prompt = args.join(' ');
      if (!prompt) return sock.sendMessage(jid, { text: '❌ Usage: .bing your question' }, { quoted: msg });

      await sock.sendMessage(jid, { text: '🔍 Searching...' }, { quoted: msg });

      try {
        const res = await httpsPost(
          'generativelanguage.googleapis.com',
          `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
          { 'Content-Type': 'application/json' },
          { contents: [{ parts: [{ text: `Search and answer this question accurately: ${prompt}` }] }] }
        );

        const reply = res?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) throw new Error('No response');

        await sock.sendMessage(jid, {
          text: `🔍 *Bing AI*\n\n${reply}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Bing error: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── UPSCALE (via Pollinations — free) ───────────────────────────────────────
  {
    name: 'upscale',
    description: 'Upscale an image using AI. Reply to an image with .upscale',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;

      if (!quoted?.imageMessage) {
        return sock.sendMessage(jid, { text: '❌ Reply to an image with .upscale' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '🔍 Upscaling image...' }, { quoted: msg });

      try {
        const { downloadMediaMessage } = require("@whiskeysockets/baileys");
        const media = await downloadMediaMessage({
          message: quoted,
          key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }
        });

        const base64 = media.toString('base64');
        const url = `https://image.pollinations.ai/prompt/upscale+enhance+4k+quality?width=1024&height=1024&nologo=true&image=${encodeURIComponent('data:image/jpeg;base64,' + base64)}`;

        const buffer = await downloadImage(url);

        await sock.sendMessage(jid, {
          image: buffer,
          caption: '✅ *Upscaled Image*'
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Upscale error: ' + e.message }, { quoted: msg });
      }
    }
  },

];
