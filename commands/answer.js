/**
 * commands/answer.js
 * -------------------
 * Checks a trivia answer (A/B/C/D) against the currently active trivia
 * game in this chat, started via !game trivia.
 *
 * Usage: !answer A
 */
const { activeGames } = require('./game');

module.exports = {
  name: 'answer',
  description: 'Answers the active trivia question. Usage: !answer A',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const game = activeGames.get(jid);

    if (!game || game.type !== 'trivia') {
      await sock.sendMessage(
        jid,
        { text: '❌ There is no active trivia question. Start one with !game trivia.' },
        { quoted: msg }
      );
      return;
    }

    const guess = args[0]?.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(guess)) {
      await sock.sendMessage(jid, { text: 'Usage: !answer A (or B, C, D)' }, { quoted: msg });
      return;
    }

    activeGames.delete(jid);

    if (guess === game.correctLetter) {
      await sock.sendMessage(jid, { text: `✅ Correct! The answer was ${game.correctLetter}.` }, { quoted: msg });
    } else {
      await sock.sendMessage(
        jid,
        { text: `❌ Wrong. The correct answer was ${game.correctLetter}.` },
        { quoted: msg }
      );
    }
  },
};
