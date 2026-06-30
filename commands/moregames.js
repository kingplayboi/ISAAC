/**
 * commands/moregames.js
 * -----------------------
 * Additional games: RPS (rock-paper-scissors), wordguess (hangman-style), mathquiz
 */

const activeWordGames = new Map();
const activeMathGames = new Map();

const WORDS = [
  'javascript', 'whatsapp', 'baileys', 'computer', 'elephant', 'mountain',
  'sandwich', 'umbrella', 'keyboard', 'dolphin', 'butterfly', 'chocolate',
  'astronaut', 'telescope', 'adventure', 'harmony', 'volcano', 'penguin'
];

function maskWord(word, guessed) {
  return word.split('').map(c => guessed.includes(c) ? c : '_').join(' ');
}

module.exports = [

  // ── ROCK PAPER SCISSORS ─────────────────────────────────────────────────────
  {
    name: 'rps',
    description: 'Play Rock Paper Scissors against the bot. Usage: .rps rock/paper/scissors',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const choice = args[0]?.toLowerCase();
      const valid = ['rock', 'paper', 'scissors'];

      if (!valid.includes(choice)) {
        return sock.sendMessage(jid, { text: '❌ Usage: .rps rock | .rps paper | .rps scissors' }, { quoted: msg });
      }

      const botChoice = valid[Math.floor(Math.random() * 3)];
      const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };

      let result;
      if (choice === botChoice) {
        result = "🤝 It's a draw!";
      } else if (
        (choice === 'rock' && botChoice === 'scissors') ||
        (choice === 'paper' && botChoice === 'rock') ||
        (choice === 'scissors' && botChoice === 'paper')
      ) {
        result = '🎉 You win!';
      } else {
        result = '🤖 Bot wins!';
      }

      await sock.sendMessage(jid, {
        text: `${emoji[choice]} *You* vs *Bot* ${emoji[botChoice]}\n\nYou chose: ${choice}\nBot chose: ${botChoice}\n\n${result}`
      }, { quoted: msg });
    }
  },

  // ── WORD GUESS (hangman style) ───────────────────────────────────────────────
  {
    name: 'wordguess',
    aliases: ['wg'],
    description: 'Start a word guessing game. Usage: .wordguess',
    activeWordGames,
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (activeWordGames.has(jid)) {
        return sock.sendMessage(jid, { text: '⚠️ A word guess game is already running. Use .guess <letter> to play, or .wgend to stop.' }, { quoted: msg });
      }

      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      activeWordGames.set(jid, { word, guessed: [], attemptsLeft: 6 });

      await sock.sendMessage(jid, {
        text: `🔤 *Word Guess Started!*\n\n${maskWord(word, [])}\n\n❤️ Attempts left: 6\nUse *.guess <letter>* to guess a letter.`
      }, { quoted: msg });
    }
  },

  // ── GUESS (letter for word guess game) ───────────────────────────────────────
  {
    name: 'guess',
    description: 'Guess a letter in the word guess game. Usage: .guess a',
    activeWordGames,
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const game = activeWordGames.get(jid);

      if (!game) {
        return sock.sendMessage(jid, { text: '❌ No active word guess game. Start one with .wordguess' }, { quoted: msg });
      }

      const letter = args[0]?.toLowerCase();
      if (!letter || letter.length !== 1 || !/[a-z]/.test(letter)) {
        return sock.sendMessage(jid, { text: '❌ Usage: .guess <single letter>' }, { quoted: msg });
      }

      if (game.guessed.includes(letter)) {
        return sock.sendMessage(jid, { text: `⚠️ You already guessed "${letter}".` }, { quoted: msg });
      }

      game.guessed.push(letter);

      if (!game.word.includes(letter)) {
        game.attemptsLeft -= 1;
      }

      if (game.attemptsLeft <= 0) {
        activeWordGames.delete(jid);
        return sock.sendMessage(jid, { text: `💀 *Game Over!* The word was: *${game.word}*` }, { quoted: msg });
      }

      const masked = maskWord(game.word, game.guessed);
      if (!masked.includes('_')) {
        activeWordGames.delete(jid);
        return sock.sendMessage(jid, { text: `🎉 *You won!* The word was: *${game.word}*` }, { quoted: msg });
      }

      await sock.sendMessage(jid, {
        text: `${masked}\n\n❤️ Attempts left: ${game.attemptsLeft}\nGuessed: ${game.guessed.join(', ') || 'none'}`
      }, { quoted: msg });
    }
  },

  // ── WORD GUESS END ──────────────────────────────────────────────────────────
  {
    name: 'wgend',
    description: 'End the current word guess game.',
    activeWordGames,
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!activeWordGames.has(jid)) {
        return sock.sendMessage(jid, { text: '❌ No active game to end.' }, { quoted: msg });
      }
      const game = activeWordGames.get(jid);
      activeWordGames.delete(jid);
      await sock.sendMessage(jid, { text: `🛑 Game ended. The word was: *${game.word}*` }, { quoted: msg });
    }
  },

  // ── MATH QUIZ ───────────────────────────────────────────────────────────────
  {
    name: 'mathquiz',
    aliases: ['mq'],
    description: 'Start a math quiz. Usage: .mathquiz',
    activeMathGames,
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      const a = Math.floor(Math.random() * 50) + 1;
      const b = Math.floor(Math.random() * 50) + 1;
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];

      let answer;
      if (op === '+') answer = a + b;
      else if (op === '-') answer = a - b;
      else answer = a * b;

      activeMathGames.set(jid, { answer, expression: `${a} ${op} ${b}`, startedAt: Date.now() });

      await sock.sendMessage(jid, {
        text: `🧮 *Math Quiz!*\n\nWhat is: ${a} ${op} ${b} = ?\n\nReply with *.mans <number>*`
      }, { quoted: msg });
    }
  },

  // ── MATH ANSWER ─────────────────────────────────────────────────────────────
  {
    name: 'mans',
    description: 'Answer the math quiz. Usage: .mans <number>',
    activeMathGames,
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const game = activeMathGames.get(jid);

      if (!game) {
        return sock.sendMessage(jid, { text: '❌ No active math quiz. Start one with .mathquiz' }, { quoted: msg });
      }

      const userAnswer = parseInt(args[0], 10);
      if (isNaN(userAnswer)) {
        return sock.sendMessage(jid, { text: '❌ Usage: .mans <number>' }, { quoted: msg });
      }

      const timeTaken = ((Date.now() - game.startedAt) / 1000).toFixed(1);

      if (userAnswer === game.answer) {
        activeMathGames.delete(jid);
        await sock.sendMessage(jid, { text: `🎉 Correct! ${game.expression} = ${game.answer}\n⏱ Solved in ${timeTaken}s` }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: '❌ Wrong, try again!' }, { quoted: msg });
      }
    }
  },

];
