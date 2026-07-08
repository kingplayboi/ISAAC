const axios = require("axios");

module.exports = {
  name: "playersearch",
  description: "Search for a football player. Usage: .playersearch Bukayo Saka",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ").trim();

    if (!query) {
      return sock.sendMessage(
        chatId,
        {
          text: "⚽ *PLAYER SEARCH*\n\nExample:\n.playersearch Bukayo Saka"
        },
        { quoted: msg }
      );
    }

    let loading;

    try {
      loading = await sock.sendMessage(
        chatId,
        { text: "🔍 Searching for player..." },
        { quoted: msg }
      );

      const { data } = await axios.get(
        `https://ravenn.site/sport/playersearch?q=${encodeURIComponent(query)}`
      );

      if (!data.status || !data.result) {
        return sock.sendMessage(chatId, {
          text: "❌ Player not found.",
          edit: loading.key
        });
      }

      const player = Array.isArray(data.result)
        ? data.result[0]
        : data.result;

      let text = `⚽ *PLAYER INFORMATION*\n\n`;

      if (player.name) text += `👤 *Name:* ${player.name}\n`;
      if (player.fullName) text += `📝 *Full Name:* ${player.fullName}\n`;
      if (player.team) text += `🏟️ *Club:* ${player.team}\n`;
      if (player.country) text += `🌍 *Country:* ${player.country}\n`;
      if (player.nationality) text += `🌎 *Nationality:* ${player.nationality}\n`;
      if (player.position) text += `🎯 *Position:* ${player.position}\n`;
      if (player.age) text += `🎂 *Age:* ${player.age}\n`;
      if (player.height) text += `📏 *Height:* ${player.height}\n`;
      if (player.weight) text += `⚖️ *Weight:* ${player.weight}\n`;
      if (player.number) text += `🔢 *Shirt:* ${player.number}\n`;
      if (player.foot) text += `🦶 *Preferred Foot:* ${player.foot}\n`;
      if (player.value) text += `💰 *Market Value:* ${player.value}\n`;

      if (player.photo || player.image) {
        await sock.sendMessage(chatId, {
          image: { url: player.photo || player.image },
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
      console.error("[PLAYERSEARCH ERROR]", err);

      await sock.sendMessage(chatId, {
        text: "❌ Failed to search player.",
        edit: loading?.key
      });
    }
  }
};
