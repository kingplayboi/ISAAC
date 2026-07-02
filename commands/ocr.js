/**
 * commands/ocr.js
 * -----------------
 * Extracts text from an image using Tesseract OCR.
 * Requires: pkg install tesseract
 *
 * Usage:
 *   Reply to an image with .ocr      (or .totext — same command, two names)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

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

async function runOcr(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getRepliedImage(msg);

  if (!target) {
    return sock.sendMessage(
      jid,
      { text: '❌ Reply to an image with .ocr (or .totext) to extract its text.' },
      { quoted: msg }
    );
  }

  await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });

  let tmpImage;
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const buffer = await downloadMediaMessage(
      { key: target.key, message: target.message },
      'buffer',
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );

    tmpImage = path.join(os.tmpdir(), `ocr_${Date.now()}.png`);
    fs.writeFileSync(tmpImage, buffer);

    const { stdout } = await execFileAsync('tesseract', [tmpImage, 'stdout'], { timeout: 15000 });
    const text = stdout.trim();

    if (!text) {
      await sock.sendMessage(jid, { text: '📭 No readable text found in that image.' }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: `📝 *Extracted Text*\n\n${text}` }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: '', key: msg.key } });
  } catch (e) {
    await sock.sendMessage(jid, { text: `❌ OCR error: ${e.message}` }, { quoted: msg });
  } finally {
    if (tmpImage && fs.existsSync(tmpImage)) fs.unlinkSync(tmpImage);
  }
}

module.exports = [
  {
    name: 'ocr',
    description: 'Extracts text from an image. Reply to an image with .ocr',
    execute: runOcr,
  },
  {
    name: 'totext',
    description: 'Extracts text from an image (alias of .ocr). Reply to an image with .totext',
    execute: runOcr,
  },
];
