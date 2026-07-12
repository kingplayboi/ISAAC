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
const { askUncensored } = require('../lib/wormgpt');
const { KEITH_BASE } = require('../config/apis');

const wormgptSessions = new Map();

function getHistory(store, id) {
  return store.get(id) || [];
}

function pushHistory(store, id, role, content) {
  const history = getHistory(store, id);

  history.push({ role, content });

  if (history.length > 20) {
    history.shift();
  }

  store.set(id, history);
}

function buildPrompt(history, input) {
  let out = '';

  for (const msg of history) {
    out += `${msg.role === 'user' ? 'User' : 'WormGPT'}: ${msg.content}\n`;
  }

  out += `User: ${input}`;

  return out;
}
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
  description: 'Ask Gemini AI. Usage: .gemini your question',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .gemini your question' },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      jid,
      { text: '🤖 Gemini is thinking...' },
      { quoted: msg }
    );

    try {
      const encoded = encodeURIComponent(prompt);

      https.get(`${KEITH_BASE}/ai/gemini?q=${encoded}`, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          try {
            const json = JSON.parse(data);

            if (!json.status) {
              throw new Error(json.error || 'API request failed');
            }

            const reply = json.result
              .replace(/Keith AI/gi, 'ISAAC AI')
              .replace(/Keithkeizzah/gi, 'ISAAC');

            await sock.sendMessage(
              jid,
              {
                text: `🤖 *Gemini AI*\n\n${reply}`
              },
              { quoted: msg }
            );

          } catch (err) {
            await sock.sendMessage(
              jid,
              {
                text: `❌ Gemini error: ${err.message}`
              },
              { quoted: msg }
            );
          }
        });

      }).on('error', async (err) => {
        await sock.sendMessage(
          jid,
          {
            text: `❌ Gemini error: ${err.message}`
          },
          { quoted: msg }
        );
      });

    } catch (err) {
      await sock.sendMessage(
        jid,
        {
          text: `❌ Gemini error: ${err.message}`
        },
        { quoted: msg }
      );
    }
  }
},

  // ── GROQ ────────────────────────────────────────────────────────────────────
  {
  name: 'groq',
  description: 'Ask Groq AI. Usage: .groq your question',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .groq your question' },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      jid,
      { text: '⚡ Groq is thinking...' },
      { quoted: msg }
    );

    try {
      const encoded = encodeURIComponent(prompt);

      https.get(`${KEITH_BASE}/ai/gpt?q=${encoded}`, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          try {
            const json = JSON.parse(data);

            if (!json.status) {
              throw new Error(json.error || 'API request failed');
            }

            const reply = json.result
              .replace(/Keith AI/gi, 'ISAAC AI')
              .replace(/Keithkeizzah/gi, 'ISAAC');

            await sock.sendMessage(
              jid,
              {
                text: `⚡ *Groq AI*\n\n${reply}`
              },
              { quoted: msg }
            );

          } catch (err) {
            await sock.sendMessage(
              jid,
              {
                text: `❌ Groq error: ${err.message}`
              },
              { quoted: msg }
            );
          }
        });

      }).on('error', async (err) => {
        await sock.sendMessage(
          jid,
          {
            text: `❌ Groq error: ${err.message}`
          },
          { quoted: msg }
        );
      });

    } catch (err) {
      await sock.sendMessage(
        jid,
        {
          text: `❌ Groq error: ${err.message}`
        },
        { quoted: msg }
      );
    }
  }
},

  // ── GPT (uses Groq under the hood — free) ───────────────────────────────────
  {
  name: 'gpt',
  description: 'Ask GPT AI. Usage: .gpt your question',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .gpt your question' },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      jid,
      { text: '🧠 GPT is thinking...' },
      { quoted: msg }
    );

    try {
      const encoded = encodeURIComponent(prompt);

      https.get(`${KEITH_BASE}/ai/gpt?q=${encoded}`, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          try {
            const json = JSON.parse(data);

            if (!json.status) {
              throw new Error(json.error || 'API request failed');
            }

            const reply = json.result
              .replace(/Keith AI/gi, 'ISAAC AI')
              .replace(/Keithkeizzah/gi, 'ISAAC');

            await sock.sendMessage(
              jid,
              {
                text: `🧠 *GPT AI*\n\n${reply}`
              },
              { quoted: msg }
            );

          } catch (err) {
            await sock.sendMessage(
              jid,
              {
                text: `❌ GPT error: ${err.message}`
              },
              { quoted: msg }
            );
          }
        });

      }).on('error', async (err) => {
        await sock.sendMessage(
          jid,
          {
            text: `❌ GPT error: ${err.message}`
          },
          { quoted: msg }
        );
      });

    } catch (err) {
      await sock.sendMessage(
        jid,
        {
          text: `❌ GPT error: ${err.message}`
        },
        { quoted: msg }
      );
    }
  }
},
{
  name: 'worm',
  sessions: wormgptSessions,
  aliases: ['wormgpt', 'wgpt', 'dark', 'darkgpt'],
  description: 'WormGPT with conversation memory. Usage: .worm your question',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ').trim();

    if (!text) {
      return sock.sendMessage(
        jid,
        {
          text: '❌ Usage: .worm your question\n\n💡 Use .worm -clear to reset conversation history.'
        },
        { quoted: msg }
      );
    }

    const userId = msg.key.participant || jid;

    if (text === '-clear') {
      wormgptSessions.delete(userId);

      return sock.sendMessage(
        jid,
        {
          text: '🧹 *WormGPT history cleared!* Fresh start.'
        },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: '☠️ WormGPT is thinking...'
      },
      { quoted: msg }
    );

    try {
      const systemPrompt = `
You are WormGPT, a dark cyberpunk AI assistant with memory.
You are witty, mysterious, sarcastic, and entertaining.
Use emojis naturally when they fit the mood (💀🔥😈🧪😂).
Remember previous messages in the conversation and maintain context.
Created by Nick and BlueBlizzards.
`;

      const history = getHistory(wormgptSessions, userId);
      const prompt = buildPrompt(history, text);

      const combined =
        `${systemPrompt}\n\n${prompt}\n\nWormGPT:`;

      const reply = await askUncensored(combined);

      pushHistory(wormgptSessions, userId, 'user', text);
      pushHistory(wormgptSessions, userId, 'assistant', reply);

      await sock.sendMessage(
        jid,
        {
          text: `☠️ *WormGPT*\n\n${reply}`
        },
        { quoted: msg }
      );

    } catch (e) {
      await sock.sendMessage(
        jid,
        {
          text: '❌ WormGPT error: ' + e.message
        },
        { quoted: msg }
      );
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
