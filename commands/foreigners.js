/**
 * commands/foreigners.js
 * -------------------------
 * Lists group members whose number isn't Kenyan (+254), with an option
 * to remove them all at once.
 * Usage:
 *   .foreigners      - shows the list, tagged
 *   .foreigners -x   - removes all foreigners (admin only, destructive)
 */
const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

const LOCAL_CODE = '254';

module.exports = {
  name: 'foreigners',
  description: 'Lists (or removes) group members not on a Kenyan (+254) number.',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(jid);

    const foreigners = metadata.participants.filter(p => {
      const number = (p.phoneNumber || p.id).split('@')[0];
      return !number.startsWith(LOCAL_CODE);
    });

    if (!foreigners.length) {
      return sock.sendMessage(jid, { text: '✅ Everyone in this group is on a Kenyan number.' }, { quoted: msg });
    }

    const isRemove = args[0] === '-x';

    if (!isRemove) {
      const text = `🌍 *Non-Kenyan members (${foreigners.length}):*\n\n${foreigners.map(f => `• @${(f.phoneNumber || f.id).split('@')[0]}`).join('\n')}\n\n💡 Use *.foreigners -x* to remove all of them.`;
      return sock.sendMessage(jid, { text, mentions: foreigners.map(f => f.phoneNumber || f.id) }, { quoted: msg });
    }

    // Removal path — admin/bot-admin checks required
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (!isSenderAdmin(metadata, senderJid)) {
      return sock.sendMessage(jid, { text: '❌ Only group admins can remove members.' }, { quoted: msg });
    }
    if (!isBotAdmin(sock, metadata)) {
      return sock.sendMessage(jid, { text: '❌ I need to be a group admin to remove members.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: `🌍 Removing ${foreigners.length} non-Kenyan member(s)...` }, { quoted: msg });

    let removed = 0;
    let failed = 0;
    const batchSize = 5;
    const jids = foreigners.map(f => f.id);

    for (let i = 0; i < jids.length; i += batchSize) {
      const batch = jids.slice(i, i + batchSize);
      try {
        await sock.groupParticipantsUpdate(jid, batch, 'remove');
        removed += batch.length;
      } catch (e) {
        failed += batch.length;
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    await sock.sendMessage(jid, { text: `✅ Done.\nRemoved: ${removed}\nFailed: ${failed}` }, { quoted: msg });
  },
};
