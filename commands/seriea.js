const axios = require("axios");

const API = "https://ravenn.site";

module.exports = {
  name: "seriea",
  description: "Shows the current Serie A standings.",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    const loading = await sock.sendMessage(
      jid,
      { text: "🇮🇹 Fetching Serie A standings..." },
      { quoted: msg }
    );

    try {
      const { data } = await axios.get(`${API}/seriea/standings`);

      if (!data.status || !data.result?.standings) {
        throw new Error("No standings available.");
      }

      const standings = data.result.standings;

      let text = `🇮🇹 *${data.result.competition}*\n`;
      text += "```";
      text += "\nPos Team               P  GD Pts\n";
      text += "───────────────────────────────\n";

      standings.forEach((team) => {
        const pos = String(team.position).padEnd(3);

        const name = team.team
          .replace(" FC", "")
          .replace(" AFC", "")
          .replace(" AC", "")
          .replace(" Calcio", "")
          .slice(0, 18)
          .padEnd(18);

        const played = String(team.played).padEnd(3);

        const gd = String(
          team.goalDifference >= 0
            ? "+" + team.goalDifference
            : team.goalDifference
        ).padEnd(4);

        const pts = String(team.points).padStart(3);

        text += `${pos}${name}${played}${gd}${pts}\n`;
      });

      text += "```";

      await sock.sendMessage(jid, {
        text,
        edit: loading.key,
      });

    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ Failed to fetch Serie A standings.\n\n${err.message}`,
        edit: loading.key,
      });
    }
  },
};
