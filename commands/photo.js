/**
 * commands/photo.js
 * --------------------
 * Converts a replied sticker (webp) into a regular photo (png).
 * Usage: reply to a sticker with .photo
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static') || 'ffmpeg';

module.exports = {
  name: 'photo',
  description: 'Convert a replied sticker into a photo. Usage: reply to a sticker with .photo',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.stickerMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to a sticker with .photo' }, { quoted: msg });
    }

    const inputPath = path.join(os.tmpdir(), `photo_in_${Date.now()}.webp`);
    const outputPath = path.join(os.tmpdir(), `photo_out_${Date.now()}.png`);

    try {
      const media = await downloadMediaMessage(
        { message: quoted, key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant } },
        'buffer',
        {}
      );

      fs.writeFileSync(inputPath, media);

      await new Promise((resolve, reject) => {
        exec(`"${ffmpegPath}" -y -i "${inputPath}" "${outputPath}"`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error('Conversion failed.');
      }

      await sock.sendMessage(jid, {
        image: fs.readFileSync(outputPath),
        caption: '🖼️ Converted to photo',
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not convert sticker: ' + e.message }, { quoted: msg });
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  },
};
