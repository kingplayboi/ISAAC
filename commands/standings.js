const axios = require("axios");

module.exports = {
    name: "standings",
    aliases: ["fixtures", "matches"],
    description: "Show upcoming football matches",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        const leagues = {
            epl: "epl",
            bundesliga: "bundesliga",
            laliga: "laliga",
            seriea: "seriea",
            ligue1: "ligue1",
            ucl: "ucl",
            euros: "euros",
            fifa: "fifa"
        };

        if (!args[0] || !leagues[args[0].toLowerCase()]) {
            return await sock.sendMessage(jid, {
                text: `⚽ *Upcoming Football Matches*

Usage:
.standings epl
.standings bundesliga
.standings laliga
.standings seriea
.standings ligue1
.standings ucl
.standings euros
.standings fifa`
            }, { quoted: msg });
        }

        const league = leagues[args[0].toLowerCase()];

        try {
            const url = `https://apiskeith2-production-ec66.up.railway.app/${league}/upcomingmatches`;

            const { data } = await axios.get(url);

            if (!data.status || !data.result) {
                return await sock.sendMessage(jid, {
                    text: "❌ No upcoming matches found."
                }, { quoted: msg });
            }

            const competition = data.result.competition || league.toUpperCase();
            const fixtures = data.result.upcomingMatches;

if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return await sock.sendMessage(jid, {
        text: "❌ No upcoming matches found."
    }, { quoted: msg });
}

// Find the next upcoming matchday
const currentMatchday = Math.min(...fixtures.map(m => m.matchday));

// Show only matches from that matchday
const currentFixtures = fixtures.filter(
    m => m.matchday === currentMatchday
);

let text = `🏆 *${data.result.competition || league.toUpperCase()} Upcoming Matches*\n`;
text += `📅 *Matchday ${currentMatchday}*\n\n`;

for (const match of currentFixtures) {
    const date = new Date(match.date);

const formattedDate = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});

const formattedTime = date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
});

text +=
`⚽ ${match.homeTeam} vs ${match.awayTeam}
🗓️ ${formattedDate}
🕖 ${formattedTime}

`;
}

await sock.sendMessage(jid, {
    text: text.trim()
}, { quoted: msg });

        } catch (err) {
            console.error(err);

            await sock.sendMessage(jid, {
                text: "❌ Failed to fetch upcoming matches."
            }, { quoted: msg });
        }
    }
};
