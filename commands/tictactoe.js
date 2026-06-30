/**
 * commands/tictactoe.js
 * -----------------------
 * Two-player TicTacToe game played in the chat.
 *
 * Usage:
 *   .tictactoe @opponent   - start a game (mention or reply to opponent)
 *   .move 5                - place your mark in position 1-9
 *
 * Board positions:
 *   1 | 2 | 3
 *   4 | 5 | 6
 *   7 | 8 | 9
 */

const activeTTT = new Map(); // jid -> { board, players: [x, o], turn, symbols }

function renderBoard(board) {
  const cell = (i) => board[i] || (i + 1).toString();
  return [
    `${cell(0)} | ${cell(1)} | ${cell(2)}`,
    '---------',
    `${cell(3)} | ${cell(4)} | ${cell(5)}`,
    '---------',
    `${cell(6)} | ${cell(7)} | ${cell(8)}`,
  ].join('\n');
}

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  if (board.every(c => c)) return 'draw';
  return null;
}

module.exports = [

  // ── START GAME ──────────────────────────────────────────────────────────────
  {
    name: 'tictactoe',
    aliases: ['ttt'],
    description: 'Start a TicTacToe game. Usage: .tictactoe @opponent',
    activeTTT,
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const opponent = ctx?.mentionedJid?.[0] || ctx?.participant;
      const challenger = msg.key.participant || msg.key.remoteJid;

      if (!opponent) {
        return sock.sendMessage(jid, { text: '❌ Tag your opponent. Usage: .tictactoe @opponent' }, { quoted: msg });
      }

      if (opponent === challenger) {
        return sock.sendMessage(jid, { text: '❌ You cannot play against yourself!' }, { quoted: msg });
      }

      if (activeTTT.has(jid)) {
        return sock.sendMessage(jid, { text: '⚠️ A game is already in progress in this chat.' }, { quoted: msg });
      }

      activeTTT.set(jid, {
        board: Array(9).fill(null),
        players: { X: challenger, O: opponent },
        turn: 'X'
      });

      const text = `
🎮 *TicTacToe Started!*

❌ @${challenger.split('@')[0]} vs ⭕ @${opponent.split('@')[0]}

${renderBoard(Array(9).fill(null))}

@${challenger.split('@')[0]}'s turn (❌). Use *.move <1-9>* to play.`.trim();

      await sock.sendMessage(jid, { text, mentions: [challenger, opponent] }, { quoted: msg });
    }
  },

  // ── MAKE A MOVE ─────────────────────────────────────────────────────────────
  {
    name: 'move',
    description: 'Make a TicTacToe move. Usage: .move <1-9>',
    activeTTT,
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const game = activeTTT.get(jid);
      const player = msg.key.participant || msg.key.remoteJid;

      if (!game) {
        return sock.sendMessage(jid, { text: '❌ No active game. Start one with .tictactoe @opponent' }, { quoted: msg });
      }

      const currentPlayerJid = game.players[game.turn];
      if (player !== currentPlayerJid) {
        return sock.sendMessage(jid, { text: '⏳ It\'s not your turn!' }, { quoted: msg });
      }

      const pos = parseInt(args[0], 10);
      if (!pos || pos < 1 || pos > 9) {
        return sock.sendMessage(jid, { text: '❌ Enter a position between 1-9. Usage: .move 5' }, { quoted: msg });
      }

      const idx = pos - 1;
      if (game.board[idx]) {
        return sock.sendMessage(jid, { text: '❌ That spot is already taken!' }, { quoted: msg });
      }

      const symbol = game.turn === 'X' ? '❌' : '⭕';
      game.board[idx] = symbol;

      const winnerSymbol = checkWinner(game.board);

      if (winnerSymbol === 'draw') {
        activeTTT.delete(jid);
        return sock.sendMessage(jid, {
          text: `🤝 *It's a draw!*\n\n${renderBoard(game.board)}`
        }, { quoted: msg });
      }

      if (winnerSymbol) {
        const winnerJid = winnerSymbol === '❌' ? game.players.X : game.players.O;
        activeTTT.delete(jid);
        return sock.sendMessage(jid, {
          text: `🎉 *@${winnerJid.split('@')[0]} wins!*\n\n${renderBoard(game.board)}`,
          mentions: [winnerJid]
        }, { quoted: msg });
      }

      game.turn = game.turn === 'X' ? 'O' : 'X';
      const nextPlayerJid = game.players[game.turn];
      const nextSymbol = game.turn === 'X' ? '❌' : '⭕';

      await sock.sendMessage(jid, {
        text: `${renderBoard(game.board)}\n\n@${nextPlayerJid.split('@')[0]}'s turn (${nextSymbol}). Use *.move <1-9>*.`,
        mentions: [nextPlayerJid]
      }, { quoted: msg });
    }
  },

  // ── END GAME ────────────────────────────────────────────────────────────────
  {
    name: 'ttend',
    description: 'End the current TicTacToe game in this chat.',
    activeTTT,
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!activeTTT.has(jid)) {
        return sock.sendMessage(jid, { text: '❌ No active game to end.' }, { quoted: msg });
      }
      activeTTT.delete(jid);
      await sock.sendMessage(jid, { text: '🛑 TicTacToe game ended.' }, { quoted: msg });
    }
  },

];
