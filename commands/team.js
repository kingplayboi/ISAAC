const axios = require("axios");

module.exports = {
  name: "teamsearch",
  description: "Search for a football team. Usage: .teamsearch Arsenal",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ").trim();

    if (!query) {
      return sock.sendMessage(
        chatId,
        {
          text: "⚽ *TEAM SEARCH*\n\nExample:\n.teamsearch Arsenal"
        },
        { quoted: msg }
      );
    }

    let loading;

    try {
      loading = await sock.sendMessage(
        chatId,
        { text: "🔍 Searching for team..." },
        { quoted: msg }
      );

      const { data } = await axios.get(
        `https://ravenn.site/sport/teamsearch?q=${encodeURIComponent(query)}`
      );

      if (!data.status || !data.result) {
        return sock.sendMessage(chatId, {
          text: "❌ Team not found.",
          edit: loading.key
        });
      }

      const team = Array.isArray(data.result)
        ? data.result[0]
        : data.result;

      let text = `⚽ *TEAM INFORMATION*\n\n`;

      if (team.name) text += `🏟️ *Name:* ${team.name}\n`;
      if (team.country) text += `🌍 *Country:* ${team.country}\n`;
      if (team.league) text += `🏆 *League:* ${team.league}\n`;
      if (team.founded) text += `📅 *Founded:* ${team.founded}\n`;
      if (team.stadium) text += `🏟️ *Stadium:* ${team.stadium}\n`;
      if (team.coach) text += `👔 *Coach:* ${team.coach}\n`;
      if (team.website) text += `🌐 *Website:* ${team.website}\n`;

      if (team.logo) {
        await sock.sendMessage(chatId, {
          image: { url: team.logo },
          caption: text,
          edit: loading.key
        });
      } else {
        await sock.sendMessage(chatId, {
          text,
          edit: loading.key
        });
      }

    } catch (err) {
      console.error("[TEAMSEARCH ERROR]", err);

      await sock.sendMessage(chatId, {
        text: "❌ Failed to search team.",
        edit: loading?.key
      });
    }
  }
};
