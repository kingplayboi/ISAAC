/**
 * commands/toexcel.js
 * ---------------------
 * Converts a replied text/CSV document into an .xlsx spreadsheet.
 * Requires: npm install xlsx
 *
 * Usage:
 *   Reply to a .txt or .csv document with .toexcel
 *   (each line becomes a row; commas/tabs split into columns)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function getRepliedDocument(msg) {
  const m = msg.message;
  if (m?.documentMessage) return { message: m, key: msg.key };

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
    };
  }
  return null;
}

module.exports = {
  name: 'toexcel',
  description: 'Converts a replied text/CSV file into an Excel spreadsheet. Reply to a document with .toexcel',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getRepliedDocument(msg);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: '❌ Reply to a .txt or .csv document with .toexcel to convert it.' },
        { quoted: msg }
      );
    }

    let tmpOut;
    try {
      const XLSX = require('xlsx');
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');

      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      const text = buffer.toString('utf8');
      const rows = text
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => line.split(/,|\t/));

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      tmpOut = path.join(os.tmpdir(), `toexcel_${Date.now()}.xlsx`);
      XLSX.writeFile(workbook, tmpOut);

      await sock.sendMessage(
        jid,
        {
          document: fs.readFileSync(tmpOut),
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: 'converted.xlsx',
        },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error converting to Excel: ${e.message}` }, { quoted: msg });
    } finally {
      if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    }
  },
};
