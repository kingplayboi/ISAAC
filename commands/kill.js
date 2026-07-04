/**
 * commands/kill.js
 * -----------------
 * Removes ALL other members from the group, effectively "killing" it.
 * Extremely destructive — requires typing .kill confirm to actually run.
 * Restricted to the bot owner only. The bot itself must also be a
 * group admin to actually remove members.
 *
 * Usage:
 *   .kill            - shows a warning and asks for confirmation
 *   .kill confirm    - actually removes everyone (except the bot and the sender)
 */
const { isBotAdmin, getBotIdentifiers } = require('../utils/isAdmin');
const { isOwner } = require('../utils/isOwner');

module.exports = {
  name: 'kill',
  description: 'Removes all members from the group (owner only, destructive).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (!isBotAdmin(sock, metadata)) {
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
    const botIds = getBotIdentifiers(sock);
    const targets = metadata.participants
      .map(p => p.id)
      .filter(id => !botIds.has(id) && id !== senderJid);

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
