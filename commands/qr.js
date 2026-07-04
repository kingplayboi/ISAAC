/**
 * commands/qr.js
 * ----------------
 * Create a QR code from text, or read a QR code from a replied image.
 * Usage:
 *   .qr <text>          -> generates a QR code image
 *   .qr                 -> (reply to an image) reads the QR code in it
 *
 * Requires: npm install qrcode jimp jsqr
 */

const QRCode = require('qrcode');
const Jimp = require('jimp');
const jsQR = require('jsqr');

module.exports = {
  name: 'qr',
  description: 'Create a QR code from text, or read one from an image. Usage: .qr <text>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const text = args.join(' ');

    // Reading mode: replying to an image with .qr (no text supplied)
    if (quoted?.imageMessage && !text) {
      try {
        const media = await sock.downloadMediaMessage({
          message: quoted,
          key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }
        });

        const image = await Jimp.read(media);
        const { data, width, height } = image.bitmap;
        const code = jsQR(new Uint8ClampedArray(data), width, height);

        if (!code) {
          return sock.sendMessage(jid, { text: '❌ No QR code found in that image.' }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: `📷 *QR Content:*\n${code.data}` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not read QR code: ' + e.message }, { quoted: msg });
      }
      return;
    }

    // Generation mode
    if (!text) {
      return sock.sendMessage(jid, { text: '❌ Usage: .qr <text>\nOr reply to an image containing a QR code with .qr' }, { quoted: msg });
    }

    try {
      const buffer = await QRCode.toBuffer(text, { width: 512 });
      await sock.sendMessage(jid, { image: buffer, caption: `✅ QR code for: ${text}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not generate QR code: ' + e.message }, { quoted: msg });
    }
  }
};
