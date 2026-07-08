const axios = require("axios");

const API = "https://ravenn.site/livescore";

module.exports = {
  name: "livescore",
  description: "Shows current football live scores.",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    const loading = await sock.sendMessage(
      jid,
      { text: "⚽ Fetching live matches..." },
      { quoted: msg }
    );

    try {
      const { data } = await axios.get(API);

      if (!data.status) {
        return sock.sendMessage(
          jid,
          {
            text: "❌ Failed to fetch live scores.",
            edit: loading.key
          }
        );
      }

      const games = Object.values(data.result.games);

      if (!games.length) {
        return sock.sendMessage(
          jid,
          {
            text: "📭 No matches found.",
            edit: loading.key
          }
        );
      }

      let text = "⚽ *LIVE SCORES*\n\n";

      for (const game of games.slice(0, 20)) {
        const status = game.R?.st || "NS";
        const home = game.p1;
        const away = game.p2;
        const score1 = game.R?.r1 ?? "0";
        const score2 = game.R?.r2 ?? "0";

        let emoji = "⏳";

        if (status === "FT") emoji = "✅";
        else if (status === "2T" || status === "1T") emoji = "🔴";

        text += `${emoji} *${home}* ${score1} - ${score2} *${away}*\n`;
        text += `⏱ ${status}\n\n`;
      }

      if (games.length > 20) {
        text += `📄 Showing 20 of ${games.length} matches.`;
      }

      await sock.sendMessage(jid, {
        text,
        edit: loading.key
      });

    } catch (err) {
      console.error(err);

      await sock.sendMessage(jid, {
        text: "❌ Failed to fetch live scores.",
        edit: loading.key
      });
    }
  }
};
