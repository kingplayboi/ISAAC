/**
 * commands/tag.js
 * ------------------
 * Tag members in the group.
 * Usage:
 *   .tag all <message>        -> mention everyone
 *   .tag admin <message>      -> mention only admins
 *   .tag notadmin <message>   -> mention only non-admins
 */

module.exports = {
  name: 'tag',
  description: "Tag members. Usage: .tag all|admin|notadmin <message>",
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }

    const mode = args[0]?.toLowerCase();
    const text = args.slice(1).join(' ');

    if (!['all', 'admin', 'notadmin'].includes(mode)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .tag all|admin|notadmin <message>' }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(jid);
      let participants = metadata.participants;

      if (mode === 'admin') {
        participants = participants.filter(p => p.admin);
      } else if (mode === 'notadmin') {
        participants = participants.filter(p => !p.admin);
      }

      if (!participants.length) {
        return sock.sendMessage(jid, { text: `❌ No members found for "${mode}".` }, { quoted: msg });
      }

      const mentions = participants.map(p => p.id);
      let out = text ? `${text}\n\n` : '';
      out += mentions.map(id => `@${id.split('@')[0]}`).join(' ');

      await sock.sendMessage(jid, { text: out, mentions }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not tag members: ' + e.message }, { quoted: msg });
    }
  }
};
