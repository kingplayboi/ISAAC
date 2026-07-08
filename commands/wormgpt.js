const axios = require("axios");

const API = "https://ravenn.site";

module.exports = {
  name: "wormgpt",
  description: "Chat with WormGPT AI. Usage: .wormgpt <prompt>",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ").trim();

    if (!query) {
      return await sock.sendMessage(
        chatId,
        {
          text: "🪱 *WORMGPT AI*\n\nExample:\n.wormgpt Tell me about black holes"
        },
        { quoted: msg }
      );
    }

    let loading;

    try {
      loading = await sock.sendMessage(
        chatId,
        {
          text: "🪱 WormGPT is thinking..."
        },
        { quoted: msg }
      );

      const { data } = await axios.get(
        `${API}/ai/wormgpt?q=${encodeURIComponent(query)}`
      );

      if (!data.status || !data.result) {
        return await sock.sendMessage(chatId, {
          text: "❌ WormGPT couldn't generate a response.",
          edit: loading.key
        });
      }

      const reply =
        typeof data.result === "string"
          ? data.result
          : data.result.response ||
            data.result.answer ||
            data.result.text ||
            JSON.stringify(data.result, null, 2);

      if (reply.length <= 4000) {
        await sock.sendMessage(chatId, {
          text: `🪱 *WORMGPT AI*\n\n${reply}`,
          edit: loading.key
        });
      } else {
        await sock.sendMessage(chatId, {
          text: `🪱 *WORMGPT AI*\n\n${reply.slice(0, 4000)}`,
          edit: loading.key
        });

        for (let i = 4000; i < reply.length; i += 4000) {
          await sock.sendMessage(chatId, {
            text: reply.slice(i, i + 4000)
          });
        }
      }

    } catch (err) {
      console.error("[WORMGPT ERROR]", err);

      await sock.sendMessage(chatId, {
        text: "❌ Failed to get a response from WormGPT.",
        edit: loading?.key
      });
    }
  }
};
