/**
 * commands/vv2.js
 * ------------------
 * Like .vv, but resends a revealed view-once message as a downloadable
 * document instead of inline playable media — useful when you want a
 * saveable copy rather than another disappearing-style inline view.
 * Usage: reply to a view-once message with .vv2
 */

module.exports = {
  name: 'vv2',
  description: 'Reveal a view-once message as a document. Usage: reply to it with .vv2',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    const viewOnce =
      quoted?.viewOnceMessageV2?.message ||
      quoted?.viewOnceMessage?.message ||
      quoted?.viewOnceMessageV2Extension?.message;

    if (!viewOnce) {
      return sock.sendMessage(jid, { text: '❌ Reply to a view-once photo/video with .vv2' }, { quoted: msg });
    }

    const type = viewOnce.imageMessage ? 'image' : viewOnce.videoMessage ? 'video' : null;
    if (!type) {
      return sock.sendMessage(jid, { text: '❌ Unsupported view-once media type.' }, { quoted: msg });
    }

    try {
      const media = await sock.downloadMediaMessage({
        message: viewOnce,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      const mimetype = type === 'image' ? 'image/jpeg' : 'video/mp4';
      const fileName = `viewonce_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`;

      await sock.sendMessage(
        jid,
        { document: media, mimetype, fileName, caption: '👁️ Revealed view-once media' },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not reveal view-once media: ' + e.message }, { quoted: msg });
    }
  },
};
