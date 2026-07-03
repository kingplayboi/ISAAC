/**
 * commands/vv.js
 * ----------------
 * Retrieves a view-once photo/video from a quoted message and resends
 * it normally, so it can be viewed again or saved.
 *
 * Usage: reply to a view-once photo or video with .vv
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function unwrapViewOnce(message) {
  if (!message) return null;
  let m = message;

  // Some clients wrap view-once inside an ephemeral (disappearing message) wrapper first
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;

  if (m.viewOnceMessage?.message) return m.viewOnceMessage.message;
  if (m.viewOnceMessageV2?.message) return m.viewOnceMessageV2.message;
  if (m.viewOnceMessageV2Extension?.message) return m.viewOnceMessageV2Extension.message;

  return m;
}

function getQuotedViewOnce(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (!quoted) return null;

  const unwrapped = unwrapViewOnce(quoted);
  if (!unwrapped) return null;

  if (unwrapped.imageMessage) return { type: 'image', message: unwrapped.imageMessage };
  if (unwrapped.videoMessage) return { type: 'video', message: unwrapped.videoMessage };
  return null;
}

module.exports = {
  name: 'vv',
  description: 'Retrieves a view-once photo/video from a quoted message. Reply to it with .vv',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      await sock.sendMessage(jid, { text: '❌ Reply to a view-once photo or video with .vv' }, { quoted: msg });
      return;
    }

const found = getQuotedViewOnce(msg);
    if (!found) {
      // TEMP DEBUG — writes to a file instead of console so it doesn't get
      // mixed in with other bot logs. Remove once this is confirmed working.
      const fs = require('fs');
      const path = require('path');
      const debugPath = path.join(__dirname, '../vv_debug.json');
      fs.writeFileSync(debugPath, JSON.stringify({ contextInfo: ctx, quotedMessage: ctx.quotedMessage }, null, 2));

      await sock.sendMessage(jid, { text: '⚠️ Please reply to a View Once message.' }, { quoted: msg });
      return;
    }
    try {
      const buffer = await downloadMediaMessage(
        { message: { [`${found.type}Message`]: found.message } },
        'buffer',
        {}
      );

      const caption = found.message.caption || '';

      if (found.type === 'image') {
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
      }
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to retrieve view-once media: ${error.message}` }, { quoted: msg });
    }
  },
};
