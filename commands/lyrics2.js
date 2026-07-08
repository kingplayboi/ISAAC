const axios = require("axios");

const API = "https://ravenn.site";

module.exports = {
  name: "lyrics2",
  description: "Search song lyrics. Usage: .lyrics2 <song name>",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ").trim();

    if (!query) {
      return await sock.sendMessage(
        chatId,
        {
          text: "🎵 *LYRICS SEARCH*\n\nExample:\n.lyrics2 Faded"
        },
        { quoted: msg }
      );
    }

    let loading;

    try {
      loading = await sock.sendMessage(
        chatId,
        {
          text: "🔍 Searching lyrics..."
        },
        { quoted: msg }
      );

      const { data } = await axios.get(
        `${API}/search/lyrics?query=${encodeURIComponent(query)}`
      );

      if (!data.status || !data.result) {
        return await sock.sendMessage(chatId, {
          text: "❌ Lyrics not found.",
          edit: loading.key
        });
      }

      const song = data.result;

      let text = `🎵 *SONG LYRICS*\n\n`;

      if (song.title) text += `🎧 *Title:* ${song.title}\n`;
      if (song.artist) text += `👤 *Artist:* ${song.artist}\n`;
      if (song.album) text += `💿 *Album:* ${song.album}\n`;

      text += `\n📜 *Lyrics:*\n\n`;
      text += song.lyrics || song.lyric || "No lyrics available.";

      // WhatsApp has a message limit, so split if necessary
      if (text.length <= 4000) {
        await sock.sendMessage(chatId, {
          text,
          edit: loading.key
        });
      } else {
        await sock.sendMessage(chatId, {
          text: text.slice(0, 4000),
          edit: loading.key
        });

        for (let i = 4000; i < text.length; i += 4000) {
          await sock.sendMessage(chatId, {
            text: text.slice(i, i + 4000)
          });
        }
      }

    } catch (err) {
      console.error("[LYRICS ERROR]", err);

      await sock.sendMessage(chatId, {
        text: "❌ Failed to fetch lyrics.",
        edit: loading?.key
      });
    }
  }
};
