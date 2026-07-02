/**
 * commands/topdf.js
 * -------------------
 * Converts a replied image into a single-page PDF.
 * Requires: npm install pdf-lib
 *
 * Usage:
 *   Reply to an image with .topdf
 */

const fs = require('fs');

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
  name: 'topdf',
  description: 'Converts an image into a PDF. Reply to an image with .topdf',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getRepliedImage(msg);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: '❌ Reply to an image with .topdf to convert it to a PDF.' },
        { quoted: msg }
      );
    }

    try {
      const { PDFDocument } = require('pdf-lib');
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');

      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      const pdfDoc = await PDFDocument.create();

      let embeddedImage;
      try {
        embeddedImage = await pdfDoc.embedJpg(buffer);
      } catch {
        embeddedImage = await pdfDoc.embedPng(buffer);
      }

      const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });

      const pdfBytes = await pdfDoc.save();

      await sock.sendMessage(
        jid,
        {
          document: Buffer.from(pdfBytes),
          mimetype: 'application/pdf',
          fileName: 'converted.pdf',
        },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error converting to PDF: ${e.message}` }, { quoted: msg });
    }
  },
};
