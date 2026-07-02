/**
 * commands/tovideo.js
 * ---------------------
 * Converts a still image into a short video clip.
 *
 * Usage:
 *   Reply to an image with .tovideo
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const CLIP_DURATION_SECONDS = 5;

function getRepliedImage(msg) {
  const m = msg.message;
  if (m?.imageMessage) return { message: m, key: msg.key };

  const ctx = m?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (quoted?.imageMessage) {
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
  name: 'tovideo',
  description: 'Converts an image into a short video. Reply to an image with .tovideo',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getRepliedImage(msg);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: '❌ Reply to an image with .tovideo to convert it to a short video.' },
        { quoted: msg }
      );
    }

    await sock.sendMessage(jid, { react: { text: '🎞️', key: msg.key } });

    let tmpImage, tmpVideo;
    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      tmpImage = path.join(os.tmpdir(), `tovideo_${Date.now()}.png`);
      tmpVideo = path.join(os.tmpdir(), `tovideo_${Date.now()}.mp4`);
      fs.writeFileSync(tmpImage, buffer);

      await execFileAsync('ffmpeg', [
        '-y',
        '-loop', '1',
        '-i', tmpImage,
        '-t', String(CLIP_DURATION_SECONDS),
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-pix_fmt', 'yuv420p',
        tmpVideo,
      ]);

      await sock.sendMessage(jid, { video: fs.readFileSync(tmpVideo) }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error creating video: ${e.message}` }, { quoted: msg });
    } finally {
      [tmpImage, tmpVideo].forEach((f) => { if (f && fs.existsSync(f)) fs.unlinkSync(f); });
    }
  },
};
