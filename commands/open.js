/**
 * commands/open.js
 * ------------------
 * Reopens the group so all members can send messages. Admin-only.
 *
 * Usage: .open
 */
module.exports = {
  name: 'open',
  description: 'Reopens the group for all members to message (admin only).',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const normalizeJid = (jid) => jid?.split('@')[0].split(':')[0];
    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user.id;

    const isSenderAdmin = metadata.participants.some(
      (p) => normalizeJid(p.id) === normalizeJid(senderJid) && !!p.admin
    );
    const isBotAdmin = metadata.participants.some(
      (p) => normalizeJid(p.id) === normalizeJid(botJid) && !!p.admin
    );

    if (!isSenderAdmin) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!isBotAdmin) {
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to unlock the group.' }, { quoted: msg });
      return;
    }

    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await sock.sendMessage(jid, { text: '🔓 Group opened. Everyone can send messages now.' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to open group: ${error.message}` }, { quoted: msg });
    }
  },
};
