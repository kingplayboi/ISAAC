/**
 * commands/kill.js
 * -----------------
 * Removes ALL other members from the group, effectively "killing" it.
 * Extremely destructive — requires typing .kill confirm to actually run.
 * Both the command sender and the bot must be group admins.
 *
 * Usage:
 *   .kill            - shows a warning and asks for confirmation
 *   .kill confirm    - actually removes everyone (except the bot and the sender)
 */

module.exports = {
  name: 'kill',
  description: 'Removes all members from the group (admin only, destructive).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    const isSenderAdmin = metadata.participants.some(
      (p) => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    const isBotAdmin = metadata.participants.some(
      (p) => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!isSenderAdmin) {
      return sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    }
    if (!isBotAdmin) {
      return sock.sendMessage(jid, { text: '❌ I need to be a group admin to remove members.' }, { quoted: msg });
    }

    if (args[0] !== 'confirm') {
      return sock.sendMessage(jid, {
        text:
          '⚠️ *DANGER ZONE* ⚠️\n\n' +
          'This will remove *every other member* from this group. This cannot be undone.\n\n' +
          'If you are absolutely sure, type:\n*.kill confirm*'
      }, { quoted: msg });
    }

    // Build the removal list: everyone except the bot itself and the person who ran the command.
    const targets = metadata.participants
      .map(p => p.id)
      .filter(id => id !== botJid && id !== senderJid);

    if (targets.length === 0) {
      return sock.sendMessage(jid, { text: 'ℹ️ No other members to remove.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: `💀 Removing ${targets.length} member(s)...` }, { quoted: msg });

    let removed = 0;
    let failed = 0;

    // Remove in small batches to avoid WhatsApp rate limits / failures
    const batchSize = 5;
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      try {
        await sock.groupParticipantsUpdate(jid, batch, 'remove');
        removed += batch.length;
      } catch (e) {
        failed += batch.length;
      }
      // Small delay between batches to be gentler on rate limits
      await new Promise(r => setTimeout(r, 1500));
    }

    await sock.sendMessage(jid, {
      text: `✅ Done.\nRemoved: ${removed}\nFailed: ${failed}`
    }, { quoted: msg });
  },
};
