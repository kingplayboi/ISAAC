const axios = require("axios");

const API = "https://ravenn.site";

module.exports = {
  name: "claude",
  description: "Chat with Claude AI. Usage: .claude <question>",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ").trim();

    if (!query) {
      return await sock.sendMessage(
        chatId,
        {
          text: "🤖 *CLAUDE AI*\n\nExample:\n.claude Tell me a joke"
        },
        { quoted: msg }
      );
    }

    let loading;

    try {
      loading = await sock.sendMessage(
        chatId,
        {
          text: "🤖 Claude is thinking..."
        },
        { quoted: msg }
      );

      const { data } = await axios.get(
        `${API}/ai/claudeai?q=${encodeURIComponent(query)}`
      );

      if (!data.status || !data.result) {
        return await sock.sendMessage(chatId, {
          text: "❌ Claude couldn't generate a response.",
          edit: loading.key
        });
      }

      const reply =
        typeof data.result === "string"
          ? data.result
          : data.result.response ||
            data.result.answer ||
            JSON.stringify(data.result, null, 2);

      // Split long responses
      if (reply.length <= 4000) {
        await sock.sendMessage(chatId, {
          text: `🤖 *CLAUDE AI*\n\n${reply}`,
          edit: loading.key
        });
      } else {
        await sock.sendMessage(chatId, {
          text: `🤖 *CLAUDE AI*\n\n${reply.slice(0, 4000)}`,
          edit: loading.key
        });

        for (let i = 4000; i < reply.length; i += 4000) {
          await sock.sendMessage(chatId, {
            text: reply.slice(i, i + 4000)
          });
        }
      }

    } catch (err) {
      console.error("[CLAUDE ERROR]", err);

      await sock.sendMessage(chatId, {
        text: "❌ Failed to get a response from Claude AI.",
        edit: loading?.key
      });
    }
  }
};
