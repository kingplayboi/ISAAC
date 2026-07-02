/**
 * commands/toword.js
 * --------------------
 * Converts a replied text/PDF document into a .docx Word document.
 * Requires: npm install docx pdf-parse
 *
 * Usage:
 *   Reply to a .txt or .pdf document with .toword
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function getRepliedDocument(msg) {
  const m = msg.message;
  if (m?.documentMessage) return { message: m, key: msg.key, mimetype: m.documentMessage.mimetype };

  const ctx = m?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (quoted?.documentMessage) {
    return {
      message: quoted,
      key: {
        remoteJid: msg.key.remoteJid,
        id: ctx.stanzaId,
        fromMe: false,
        participant: ctx.participant,
      },
      mimetype: quoted.documentMessage.mimetype,
    };
  }
  return null;
}

module.exports = {
  name: 'toword',
  description: 'Converts a replied text/PDF file into a Word document. Reply to a document with .toword',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getRepliedDocument(msg);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: '❌ Reply to a .txt or .pdf document with .toword to convert it.' },
        { quoted: msg }
      );
    }

    let tmpOut;
    try {
      const { Document, Packer, Paragraph } = require('docx');
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');

      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      let text;
      if (target.mimetype === 'application/pdf') {
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } else {
        text = buffer.toString('utf8');
      }

      const paragraphs = text
        .split(/\r?\n/)
        .map((line) => new Paragraph(line));

      const doc = new Document({
        sections: [{ children: paragraphs }],
      });

      const docBuffer = await Packer.toBuffer(doc);
      tmpOut = path.join(os.tmpdir(), `toword_${Date.now()}.docx`);
      fs.writeFileSync(tmpOut, docBuffer);

      await sock.sendMessage(
        jid,
        {
          document: fs.readFileSync(tmpOut),
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileName: 'converted.docx',
        },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error converting to Word: ${e.message}` }, { quoted: msg });
    } finally {
      if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    }
  },
};
