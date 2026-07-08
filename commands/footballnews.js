const axios = require("axios");

const API = "https://ravenn.site/football/news";

module.exports = {
  name: "news",
  description: "Get the latest football news.",

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;

    try {
      const loading = await sock.sendMessage(
        chatId,
        { text: "📰 Fetching latest football news..." },
        { quoted: msg }
      );

      const { data } = await axios.get(API);

      if (!data.status || !Array.isArray(data.result) || data.result.length === 0) {
        return await sock.sendMessage(
          chatId,
          { text: "❌ No football news found." },
          { quoted: msg }
        );
      }

      const news = data.result.slice(0, 10);

      let text = "📰 *LATEST FOOTBALL NEWS*\n\n";

      news.forEach((item, i) => {
        text += `*${i + 1}. ${item.title}*\n`;
        if (item.date) text += `📅 ${item.date}\n`;
        if (item.source) text += `📰 ${item.source}\n`;
        if (item.link) text += `🔗 ${item.link}\n`;
        text += "\n";
      });

      await sock.sendMessage(chatId, {
        text,
        edit: loading.key
      });

    } catch (err) {
      console.error(err);

      await sock.sendMessage(chatId, {
        text: "❌ Failed to fetch football news.",
        edit: loading?.key
      });
    }
  }
};
