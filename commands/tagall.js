/**
 * commands/tagall.js
 * ------------------
 * Mentions every member of the group in one message. Useful for
 * announcements. Restricted to admins so it can't be used to spam the
 * group repeatedly.
 *
 * Usage: .tagall [optional message]
 */
module.exports = {
  name: 'tagall',
  description: 'Mentions every group member (admin only).',
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

    const participantJids = metadata.participants.map((p) => p.id);
    const customMessage = args.join(' ');

    const mentionLines = participantJids.map((id) => `@${id.split('@')[0]}`).join('\n');
    const text = customMessage
      ? `${customMessage}\n\n${mentionLines}`
      : `📢 Attention everyone!\n\n${mentionLines}`;

    await sock.sendMessage(jid, { text, mentions: participantJids }, { quoted: msg });
  },
};
