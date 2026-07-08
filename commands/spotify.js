const axios = require("axios");
const yts = require("yt-search");

const API = "https://ravenn.site";

module.exports = {
  name: "spotify",
  description: "Search and download a track. Usage: .spotify <song name or link>",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ").trim();

    if (!query) {
      return await sock.sendMessage(
        chatId,
        {
          text: "🎵 *ISAAC-MD SPOTIFY*\n\nExample:\n.spotify Shape of You"
        },
        { quoted: msg }
      );
    }

    let statusMsg;

    try {
      // Send one status message
      statusMsg = await sock.sendMessage(
        chatId,
        {
          text: "🔍 Searching..."
        },
        { quoted: msg }
      );

      let videoUrl;
      let videoTitle;

      // User sent a YouTube link
      if (/youtu\.be|youtube\.com/i.test(query)) {
        videoUrl = query;

        const info = await yts(query);

        if (!info) {
          return await sock.sendMessage(
            chatId,
            {
              text: "❌ Invalid link.",
              edit: statusMsg.key
            }
          );
        }

        videoTitle = info.title || "Audio";
      } else {
        // Search by song name (Spotify link input also falls through to
        // here, since ravenn.site has no working Spotify-specific search —
        // this searches YouTube for the same track by name instead)
        const search = await axios.get(
          `${API}/search/yts?query=${encodeURIComponent(query)}`
        );

        const videos = search.data?.result;

        if (!Array.isArray(videos) || videos.length === 0) {
          return await sock.sendMessage(chatId, {
            text: "❌ No results found.",
            edit: statusMsg.key
          });
        }

        videoUrl = videos[0].url;
        videoTitle = videos[0].title;
      }

      // Edit to downloading
      await sock.sendMessage(chatId, {
        text: `🎧 Downloading...\n\n*${videoTitle}*`,
        edit: statusMsg.key
      });

      const download = await axios.get(
        `${API}/download/audio?url=${encodeURIComponent(videoUrl)}`
      );

      const audioUrl = download.data?.result;

      if (!audioUrl) {
        throw new Error("Failed to retrieve audio.");
      }

      const fileName = `${videoTitle}.mp3`.replace(/[\\/:*?"<>|]/g, "");

      // Send audio
      await sock.sendMessage(
        chatId,
        {
          audio: { url: audioUrl },
          mimetype: "audio/mpeg",
          fileName,
          ptt: false
        },
        { quoted: msg }
      );

      // Edit to success
      await sock.sendMessage(chatId, {
        text: `✅ Successfully downloaded\n\n🎵 *${videoTitle}*`,
        edit: statusMsg.key
      });

    } catch (err) {
      console.error("[SPOTIFY ERROR]", err);

      if (statusMsg) {
        await sock.sendMessage(chatId, {
          text: `❌ Download failed.\n\n${err.message}`,
          edit: statusMsg.key
        });
      } else {
        await sock.sendMessage(
          chatId,
          {
            text: `❌ Download failed.\n\n${err.message}`
          },
          { quoted: msg }
        );
      }
    }
  }
};
