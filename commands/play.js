const yts = require("yt-search");
const ytdl = require("ytdl-core");

module.exports = {
  name: "play",

  run: async (sock, msg, args) => {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ");

    if (!query) {
      return sock.sendMessage(chatId, {
        text: "🎵 Example: .play calm down"
      });
    }

    try {
      const search = await yts(query);
      const video = search.videos[0];

      if (!video) {
        return sock.sendMessage(chatId, {
          text: "❌ No results found"
        });
      }

      const stream = ytdl(video.url, {
        filter: "audioonly",
        quality: "highestaudio"
      });

      await sock.sendMessage(chatId, {
        audio: stream,
        mimetype: "audio/mp4"
      });

    } catch (err) {
      console.log(err);
      sock.sendMessage(chatId, {
        text: "❌ Error playing song"
      });
    }
  }
};
