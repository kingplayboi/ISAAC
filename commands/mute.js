/**
 * commands/mute.js
 * ----------------
 * Restricts the group so only admins can send messages ("Group Settings >
 * Send Messages > Only admins" in the WhatsApp UI). Admin-only command.
 *
 * Usage: .mute      (locks the group)
 *        .mute off   (unlocks the group again)
 */
module.exports = {
  name: 'mute',
  description: 'Restricts the group to admins-only messaging. Use ".mute off" to unmute.',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

    if (!isSenderAdmin(metadata, senderJid)) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!isBotAdmin(sock, metadata)) {
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to change group settings.' }, { quoted: msg });
      return;
    }

    const turningOff = args[0]?.toLowerCase() === 'off';
    await sock.groupSettingUpdate(jid, turningOff ? 'not_announcement' : 'announcement');

    const replyText = turningOff
      ? '🔓 Group unmuted — everyone can send messages again.'
      : '🔒 Group muted — only admins can send messages now.';
    await sock.sendMessage(jid, { text: replyText }, { quoted: msg });
  },
};
