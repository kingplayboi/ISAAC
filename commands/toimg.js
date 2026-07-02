/**
 * commands/toimg.js
 * -------------------
 * Converts a sticker (webp) to a regular image (png).
 *
 * Usage:
 *   Reply to a sticker with .toimg
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function getRepliedSticker(msg) {
  const m = msg.message;
  if (m?.stickerMessage) return { message: m, key: msg.key };

  const ctx = m?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (quoted?.stickerMessage) {
    return {
      message: quoted,
      key: {
        remoteJid: msg.key.remoteJid,
        id: ctx.stanzaId,
        fromMe: false,
        participant: ctx.participant,
      },
    };
  }
  return null;
}

module.exports = {
  name: 'toimg',
  description: 'Converts a sticker to an image. Reply to a sticker with .toimg',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getRepliedSticker(msg);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: '❌ Reply to a sticker with .toimg to convert it to an image.' },
        { quoted: msg }
      );
    }

    let tmpWebp, tmpPng;
    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      tmpWebp = path.join(os.tmpdir(), `toimg_${Date.now()}.webp`);
      tmpPng = path.join(os.tmpdir(), `toimg_${Date.now()}.png`);
      fs.writeFileSync(tmpWebp, buffer);

      await execFileAsync('ffmpeg', ['-y', '-i', tmpWebp, tmpPng]);

      await sock.sendMessage(jid, { image: fs.readFileSync(tmpPng) }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error converting sticker: ${e.message}` }, { quoted: msg });
    } finally {
      [tmpWebp, tmpPng].forEach((f) => { if (f && fs.existsSync(f)) fs.unlinkSync(f); });
    }
  },
};
