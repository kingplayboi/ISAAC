/**
 * commands/game.js
 * ----------------
 * Two simple games in one command:
 *
 *   !game number        - starts a "guess the number" game (1-50). Players
 *                          reply in the chat with plain numbers to guess;
 *                          guessing is handled in events/messages.js since
 *                          it needs to intercept normal (non-!) messages.
 *   !game trivia         - fetches a random trivia question from the free
 *                          Open Trivia DB API and posts it with lettered
 *                          options; answer with !answer A/B/C/D.
 *
 * Game state is kept in memory (per chat) in the exported `activeGames`
 * map so other files (like the answer-checking logic) can read it.
 */

const activeGames = new Map();

async function startNumberGame(sock, msg, jid) {
  const target = Math.floor(Math.random() * 50) + 1;
  activeGames.set(jid, { type: 'number', target, attempts: 0 });
  await sock.sendMessage(
    jid,
    { text: '🎲 I picked a number between 1 and 50. Reply with your guess!' },
    { quoted: msg }
  );
}

async function startTriviaGame(sock, msg, jid) {
  try {
    const response = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
    const data = await response.json();
    const q = data.results[0];

    const decode = (str) =>
      str
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&eacute;/g, 'é');

    const options = [...q.incorrect_answers.map(decode), decode(q.correct_answer)];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const letters = ['A', 'B', 'C', 'D'];
    const correctLetter = letters[options.indexOf(decode(q.correct_answer))];

    activeGames.set(jid, { type: 'trivia', correctLetter, question: decode(q.question) });

    const optionsText = options.map((opt, i) => `${letters[i]}) ${opt}`).join('\n');
    await sock.sendMessage(
      jid,
      {
        text:
          `🧠 *Trivia* (${decode(q.category)})\n\n${decode(q.question)}\n\n${optionsText}\n\n` +
          `Reply with !answer A, !answer B, etc.`,
      },
      { quoted: msg }
    );
  } catch (error) {
    await sock.sendMessage(
      jid,
      { text: '❌ Could not fetch a trivia question right now, try again in a moment.' },
      { quoted: msg }
    );
  }
}

module.exports = {
  name: 'game',
  description: 'Starts a game. Usage: !game number | !game trivia',
  activeGames,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = args[0]?.toLowerCase();

    if (mode === 'number') {
      await startNumberGame(sock, msg, jid);
    } else if (mode === 'trivia') {
      await startTriviaGame(sock, msg, jid);
    } else {
      await sock.sendMessage(
        jid,
        { text: 'Usage: !game number   or   !game trivia' },
        { quoted: msg }
      );
    }
  },
};
