const yts = require("yt-search");
const ytdl = require("ytdl-core");

module.exports = {
  name: "play",

  execute: async (sock, msg, args) => {
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

      await sock.sendMessage(chatId, {
        text: `🎧 Playing:\n${video.title}`
      });

const stream = ytdl(video.url, {
  filter: "audioonly",
  quality: "lowestaudio"
});

let chunks = [];

stream.on("data", (chunk) => {
  chunks.push(chunk);
});

stream.on("error", (err) => {
  console.log("Audio stream error:", err);
});

stream.on("end", async () => {
  try {
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length === 0) {
      return sock.sendMessage(chatId, {
        text: "❌ Failed to load audio"
      });
    }

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: "audio/mp4",
      ptt: false
    }, { quoted: msg });

  } catch (e) {
    console.log("Send error:", e);
    sock.sendMessage(chatId, {
      text: "❌ Error sending audio"
    });
  }
});
    } catch (err) {
      console.log(err);
      sock.sendMessage(chatId, {
        text: "❌ Failed to play song"
      });
    }
  }
};
