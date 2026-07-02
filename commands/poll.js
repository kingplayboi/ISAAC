/**
 * commands/poll.js
 * ------------------
 * Sends a poll in the group.
 *
 * Usage: .poll Question? | Option 1 | Option 2 | Option 3
 */
module.exports = {
  name: 'poll',
  description: 'Sends a poll with a question and up to 12 options.',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const input = args.join(' ').split('|').map((s) => s.trim()).filter(Boolean);
    const question = input[0];
    const options = input.slice(1);

    if (!question || options.length < 2) {
      await sock.sendMessage(
        jid,
        { text: '❌ Usage: .poll Question? | Option 1 | Option 2 | Option 3' },
        { quoted: msg }
      );
      return;
    }

    try {
      await sock.sendMessage(jid, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1,
        },
      }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to send poll: ${error.message}` }, { quoted: msg });
    }
  },
};
