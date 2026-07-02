/**
 * commands/hidetag.js
 * --------------------
 * Sends a message that notifies every group member, without visibly
 * listing their names/mentions in the text. Admin-only.
 *
 * Usage: .hidetag Your message here
 */
module.exports = {
  name: 'hidetag',
  description: 'Notifies all members silently, without listing mentions (admin only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const { isSenderAdmin } = require('../utils/isAdmin');

    if (!isSenderAdmin(metadata, senderJid)) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }

    const text = args.join(' ').trim() || '📢';
    const allJids = metadata.participants.map((p) => p.id);

    await sock.sendMessage(jid, { text, mentions: allJids }, { quoted: msg });
  },
};
