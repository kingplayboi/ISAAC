/**
 * commands/save.js
 * -------------------
 * Save a replied WhatsApp status update — resends the status's media
 * (or text) back into the chat so you have a permanent copy.
 * Usage: reply to a forwarded/quoted status with .save
 */

module.exports = {
  name: 'save',
  description: 'Save a replied status. Usage: reply to a status with .save',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(jid, { text: '❌ Reply to a status with .save' }, { quoted: msg });
    }

    try {
      if (quoted.imageMessage) {
        const media = await sock.downloadMediaMessage({
          message: quoted,
          key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
        });
        await sock.sendMessage(jid, { image: media, caption: quoted.imageMessage.caption || '✅ Status saved' }, { quoted: msg });
      } else if (quoted.videoMessage) {
        const media = await sock.downloadMediaMessage({
          message: quoted,
          key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
        });
        await sock.sendMessage(jid, { video: media, caption: quoted.videoMessage.caption || '✅ Status saved' }, { quoted: msg });
      } else if (quoted.conversation || quoted.extendedTextMessage?.text) {
        const text = quoted.conversation || quoted.extendedTextMessage.text;
        await sock.sendMessage(jid, { text: `💾 *Saved status:*\n\n${text}` }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: '❌ Unsupported status type — only image, video, or text statuses can be saved.' }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not save status: ' + e.message }, { quoted: msg });
    }
  },
};	
