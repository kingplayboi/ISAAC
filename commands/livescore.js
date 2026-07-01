/**
 * commands/livescore.js
 * ----------------------
 * Football live scores and league tables via football-data.org.
 * Free tier covers: EPL, La Liga, Bundesliga, Serie A, World Cup, and more.
 *
 * Usage:
 *   .livescore                → today's matches across EPL, La Liga, Bundesliga, Serie A, World Cup
 *   .table epl                → current EPL standings
 *   .table laliga             → current La Liga standings
 *   .table bundesliga         → current Bundesliga standings
 *   .table seriea             → current Serie A standings
 *   .table worldcup           → current World Cup group standings (during tournament windows)
 */

const https = require('https');
require('dotenv').config();

const FD_KEY = process.env.FD_KEY;

// Friendly name -> football-data.org competition code
const LEAGUE_CODES = {
  epl: 'PL',
  pl: 'PL',
  premierleague: 'PL',
  laliga: 'PD',
  pd: 'PD',
  bundesliga: 'BL1',
  bl1: 'BL1',
  seriea: 'SA',
  sa: 'SA',
  worldcup: 'WC',
  wc: 'WC',
  ucl: 'CL',
  cl: 'CL',
  championsleague: 'CL',
};

const LEAGUE_NAMES = {
  PL: '🏴 Premier League',
  PD: '🇪🇸 La Liga',
  BL1: '🇩🇪 Bundesliga',
  SA: '🇮🇹 Serie A',
  WC: '🌍 World Cup',
  CL: '⭐ Champions League',
};

const LIVE_COMPETITIONS = ['PL', 'PD', 'BL1', 'SA', 'WC'];

function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    https.get({ hostname, path, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({ error: raw });
        }
      });
    }).on('error', reject);
  });
}

function formatStatus(match) {
  const { status, score } = match;
  const home = score?.fullTime?.home;
  const away = score?.fullTime?.away;

  if (status === 'IN_PLAY' || status === 'PAUSED') {
    const liveHome = score?.fullTime?.home ?? 0;
    const liveAway = score?.fullTime?.away ?? 0;
    return `🔴 LIVE  ${liveHome} - ${liveAway}`;
  }
  if (status === 'FINISHED') {
    return `✅ FT  ${home} - ${away}`;
  }
  if (status === 'SCHEDULED' || status === 'TIMED') {
    const time = new Date(match.utcDate);
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    return `⏰ ${hh}:${mm}`;
  }
  return status;
}

module.exports = [
  {
    name: 'livescore',
    description: 'Shows today\'s football matches across EPL, La Liga, Bundesliga, Serie A, and World Cup.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (!FD_KEY) {
        return sock.sendMessage(jid, { text: '❌ Missing FD_KEY in .env — get a free key at football-data.org' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '⚽ Fetching today\'s matches...' }, { quoted: msg });

      try {
        const today = new Date().toISOString().slice(0, 10);
        const path = `/v4/matches?competitions=${LIVE_COMPETITIONS.join(',')}&dateFrom=${today}&dateTo=${today}`;

        const data = await httpsGet('api.football-data.org', path, { 'X-Auth-Token': FD_KEY });

        if (!data?.matches || data.matches.length === 0) {
          return sock.sendMessage(jid, { text: '📭 No matches scheduled today across EPL, La Liga, Bundesliga, Serie A, or World Cup.' }, { quoted: msg });
        }

        const byCompetition = {};
        for (const match of data.matches) {
          const code = match.competition?.code;
          if (!byCompetition[code]) byCompetition[code] = [];
          byCompetition[code].push(match);
        }

        let out = `⚽ *TODAY'S MATCHES*\n`;
        for (const code of LIVE_COMPETITIONS) {
          const matches = byCompetition[code];
          if (!matches || matches.length === 0) continue;

          out += `\n${LEAGUE_NAMES[code]}\n`;
          for (const m of matches) {
            const home = m.homeTeam?.shortName || m.homeTeam?.name || 'TBD';
            const away = m.awayTeam?.shortName || m.awayTeam?.name || 'TBD';
            out += `${home} vs ${away}  —  ${formatStatus(m)}\n`;
          }
        }

        await sock.sendMessage(jid, { text: out.trim() }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Livescore error: ' + e.message }, { quoted: msg });
      }
    },
  },

  {
    name: 'table',
    description: 'Shows the current league table. Usage: .table epl / laliga / bundesliga / seriea / worldcup',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;

      if (!FD_KEY) {
        return sock.sendMessage(jid, { text: '❌ Missing FD_KEY in .env — get a free key at football-data.org' }, { quoted: msg });
      }

      const input = (args[0] || '').toLowerCase().replace(/\s+/g, '');
      const code = LEAGUE_CODES[input];

      if (!code) {
        return sock.sendMessage(
          jid,
          { text: '❌ Usage: .table epl | laliga | bundesliga | seriea | worldcup | ucl' },
          { quoted: msg }
        );
      }

      await sock.sendMessage(jid, { text: `📊 Fetching ${LEAGUE_NAMES[code]} table...` }, { quoted: msg });

      try {
        const data = await httpsGet('api.football-data.org', `/v4/competitions/${code}/standings`, { 'X-Auth-Token': FD_KEY });

        const table = data?.standings?.find((s) => s.type === 'TOTAL')?.table || data?.standings?.[0]?.table;

        if (!table || table.length === 0) {
          return sock.sendMessage(jid, { text: `📭 No standings available right now for ${LEAGUE_NAMES[code]}.` }, { quoted: msg });
        }

        let out = `📊 *${LEAGUE_NAMES[code]} TABLE*\n\`\`\`\n#  Team               P  GD  Pts\n`;
        for (const row of table) {
          const pos = String(row.position).padEnd(3);
          const name = (row.team?.shortName || row.team?.name || '').slice(0, 18).padEnd(19);
          const played = String(row.playedGames).padEnd(3);
          const gd = String(row.goalDifference >= 0 ? `+${row.goalDifference}` : row.goalDifference).padEnd(4);
          const pts = row.points;
          out += `${pos}${name}${played}${gd}${pts}\n`;
        }
        out += '```';

        await sock.sendMessage(jid, { text: out }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Table error: ' + e.message }, { quoted: msg });
      }
    },
  },
];
