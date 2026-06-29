const yts = require("yt-search");
const ytdl = require("ytdl-core");

module.exports = {
  name: "play",

  run: async (sock, msg, args) => {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ");

    if (!query) {
      return sock.sendMessage(chatId, {
        text: "🎵 Send a song name\nExample: .play calm down"
      });
    }

    try {
      // Search YouTube
      const search = await yts(query);
      const video = search.videos[0];

      if (!video) {
        return sock.sendMessage(chatId, {
          text: "❌ No results found"
        });
      }

      await sock.sendMessage(chatId, {
        text: `🎵 Downloading:\n${video.title}`
      });

      // Stream audio
      const stream = ytdl(video.url, {
        filter: "audioonly",
        quality: "highestaudio"
      });

      await sock.sendMessage(chatId, {
        audio: stream,
        mimetype: "audio/mp4",
        fileName: `${video.title}.mp3`
      });

    } catch (err) {
      console.log(err);
      sock.sendMessage(chatId, {
        text: "❌ Error playing song"
      });
    }
  }
};
