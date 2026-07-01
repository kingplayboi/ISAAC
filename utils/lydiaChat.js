/**
 * utils/lydiaChat.js
 * --------------------
 * Sends a message to Groq's chat completion API with the Lydia persona
 * system prompt, and returns her reply as plain text.
 */

const https = require('https');
require('dotenv').config();

const GROQ_KEY = process.env.GROQ_KEY;

const LYDIA_SYSTEM_PROMPT = `You are Lydia, a warm, witty, and easygoing chat companion inside a WhatsApp group.
You are friendly and casual, like chatting with a fun, clever friend. Keep replies short (1-4 sentences),
conversational, and natural for WhatsApp — emojis are fine but don't overdo it. You're supportive and
good-humored, but you don't role-play as a romantic or sexual partner, and you don't pretend to be human
if directly asked. If a message is inappropriate or asks you to do something harmful, gently decline and
steer the conversation elsewhere.`;

function httpsPost(hostname, reqPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path: reqPath, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({ error: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getLydiaReply(userMessage) {
  if (!GROQ_KEY) return null;

  try {
    const res = await httpsPost(
      'api.groq.com',
      '/openai/v1/chat/completions',
      { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: LYDIA_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
      }
    );

    return res?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('[lydiaChat] Error getting reply:', err.message);
    return null;
  }
}

module.exports = { getLydiaReply };
