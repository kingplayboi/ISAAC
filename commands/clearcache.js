/**
 * commands/clearcache.js
 * -------------------------
 * Clears every in-memory cache the bot accumulates over time, so long
 * uptime doesn't slowly grow memory usage:
 *   - messageCache      (antidelete's recent-message store)
 *   - groupCache        (group metadata cache)
 *   - game.js's activeGames
 *   - moregames.js's activeWordGames / activeMathGames
 *   - ai.js's worm (WormGPT) conversation sessions
 *
 * Usage: .clearcache (owner only)
 *
 * runClearCache() is also exported so index.js can call it on a timer
 * for fully automatic periodic clearing, not just on-demand.
 */

const messageCache = require('../utils/messageCache');
const { groupCache } = require('../utils/groupCache');

function runClearCache(commands) {
  const results = {};

  results.messages = messageCache.clear();

  const groupKeysBefore = groupCache.keys().length;
  groupCache.flushAll();
  results.groups = groupKeysBefore;

  const game = commands?.get('game');
  if (game?.activeGames) {
    results.games = game.activeGames.size;
    game.activeGames.clear();
  }

  const wordguess = commands?.get('wordguess');
  if (wordguess?.activeWordGames) {
    results.wordGames = wordguess.activeWordGames.size;
    wordguess.activeWordGames.clear();
  }

  const mathquiz = commands?.get('mathquiz');
  if (mathquiz?.activeMathGames) {
    results.mathGames = mathquiz.activeMathGames.size;
    mathquiz.activeMathGames.clear();
  }

  const worm = commands?.get('worm');
  if (worm?.sessions) {
    results.wormSessions = worm.sessions.size;
    worm.sessions.clear();
  }

  return results;
}

module.exports = {
  name: 'clearcache',
  description: 'Clear all in-memory caches to free up memory (owner only).',
  runClearCache,
  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;

    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the owner can use this command.' }, { quoted: msg });
    }

    const before = process.memoryUsage().rss;
    const results = runClearCache(commands);
    const after = process.memoryUsage().rss;
    const freedMb = ((before - after) / 1024 / 1024).toFixed(1);

    const lines = [
      `💾 Messages cached: ${results.messages ?? 0}`,
      `👥 Group metadata entries: ${results.groups ?? 0}`,
      `🎮 Active games: ${results.games ?? 0}`,
      `🔤 Word-guess games: ${results.wordGames ?? 0}`,
      `🧮 Math quizzes: ${results.mathGames ?? 0}`,
      `🪱 WormGPT sessions: ${results.wormSessions ?? 0}`,
    ];

    await sock.sendMessage(
      jid,
      {
        text: `🧹 *Cache cleared*\n\n${lines.join('\n')}\n\n${freedMb > 0 ? `📉 RSS memory freed: ~${freedMb} MB` : 'ℹ️ Memory freed may not show immediately — Node reclaims it gradually.'}`,
      },
      { quoted: msg }
    );
  },
};
