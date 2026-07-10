/**
 * commands/vv2.js
 * ------------------
 * Like .vv, but resends a revealed view-once message as a downloadable
 * document instead of inline playable media — useful when you want a
 * saveable copy rather than another disappearing-style inline view.
 * Usage: reply to a view-once message with .vv2
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
  name: 'vv2',
  description: 'Reveal a view-once message as a document. Usage: reply to it with .vv2',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      await sock.sendMessage(jid, { text: '❌ Reply to a view-once photo/video with .vv2' }, { quoted: msg });
      return;
    }

    const found = getQuotedViewOnce(msg);
    if (!found) {
      await sock.sendMessage(jid, { text: '⚠️ Please reply to a View Once message.' }, { quoted: msg });
      return;
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: { [`${found.type}Message`]: found.message } },
        'buffer',
        {}
      );

      const mimetype = found.type === 'image' ? 'image/jpeg' : 'video/mp4';
      const fileName = `viewonce_${Date.now()}.${found.type === 'image' ? 'jpg' : 'mp4'}`;

      await sock.sendMessage(
        jid,
        { document: buffer, mimetype, fileName, caption: '👁️ Revealed view-once media' },
        { quoted: msg }
      );
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to retrieve view-once media: ${error.message}` }, { quoted: msg });
    }
  },
};
