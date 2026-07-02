const yts = require("yt-search");
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const os = require("os");
const path = require("path");

const execFileAsync = promisify(execFile);

module.exports = {
  name: "play",
  description: "Search and download audio from YouTube",

  execute: async (sock, msg, args) => {
    const chatId = msg.key.remoteJid;
    const query = args.join(" ");

    console.log("[PLAY] Query:", query);

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: "🎵 Example: .play calm down"
      });
    }

    let outputFile = null;

    try {
      console.log("[PLAY] Searching YouTube...");

      const search = await yts(query);
      const video = search.videos[0];

      console.log("[PLAY] Video found:", video?.title);

      if (!video) {
        return await sock.sendMessage(chatId, {
          text: "❌ No results found"
        });
      }

      await sock.sendMessage(chatId, {
        text: `🎧 Downloading:\n*${video.title}*`
      });

      const outputTemplate = path.join(
        os.tmpdir(),
        `play_${Date.now()}.%(ext)s`
      );

      console.log("[PLAY] Running yt-dlp...");

      const { stdout, stderr } = await execFileAsync("yt-dlp", [
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "-o", outputTemplate,
        video.url
      ]);

      if (stderr) {
        console.log("[yt-dlp stderr]", stderr);
      }

      console.log("[yt-dlp stdout]", stdout);

      outputFile = outputTemplate.replace("%(ext)s", "mp3");

      console.log("[PLAY] Output file:", outputFile);

      if (!fs.existsSync(outputFile)) {
        throw new Error(`Audio file not found: ${outputFile}`);
      }

      const stats = fs.statSync(outputFile);

      console.log("[PLAY] File size:", stats.size);

      if (stats.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      await sock.sendMessage(
        chatId,
        {
          audio: fs.readFileSync(outputFile),
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`,
          ptt: false
        },
        { quoted: msg }
      );

      console.log("[PLAY] Audio sent successfully");

    } catch (err) {
      console.error("[PLAY ERROR]", err);

      await sock.sendMessage(
        chatId,
        {
          text: `❌ Failed to play song.\n\n${err.message}`
        },
        { quoted: msg }
      );
    } finally {
      if (outputFile && fs.existsSync(outputFile)) {
        try {
          fs.unlinkSync(outputFile);
          console.log("[PLAY] Temporary file deleted");
        } catch (e) {
          console.log("[PLAY] Cleanup error:", e);
        }
      }
    }
  }
};
