const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yts = require('yt-search');
const config = require('../config/config');

module.exports = {
  name: 'spotify',
  description: 'Download songs as MP3',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ').trim();

    if (!query) {
      return sock.sendMessage(jid, {
        text: `🎵 Spotify Downloader\n\nUsage:\n${config.prefix}spotify song name`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, {
        react: { text: '🎵', key: msg.key }
      });

      // 1. search youtube
      const results = await yts(query);
      const video = results.videos[0];

      if (!video) {
        return sock.sendMessage(jid, {
          text: `❌ No results found for: *${query}*`
        }, { quoted: msg });
      }

      const title = video.title.replace(/[\/\\:*?"<>|]/g, '').slice(0, 60);
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;

      await sock.sendMessage(jid, {
        text: `⬇️ Downloading: *${title}*`
      }, { quoted: msg });

      // 2. safe file path (NO /tmp)
      const filePath = path.join(__dirname, `${Date.now()}.mp3`);

      // 3. download audio using yt-dlp
      execSync(
        `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${filePath}" "${url}"`
      );

      // 4. verify file
      if (!fs.existsSync(filePath)) {
        return sock.sendMessage(jid, {
          text: '❌ Download failed'
        }, { quoted: msg });
      }

      const fileBuffer = fs.readFileSync(filePath);

      if (fileBuffer.length < 1000) {
        return sock.sendMessage(jid, {
          text: '❌ Empty audio file'
        }, { quoted: msg });
      }

      // 5. send audio
      await sock.sendMessage(jid, {
        audio: fileBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: msg });

      // 6. cleanup
      fs.unlinkSync(filePath);

      await sock.sendMessage(jid, {
        text: `✅ Done: *${title}*`
      }, { quoted: msg });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, {
        text: `❌ Error: ${err.message}`
      }, { quoted: msg });
    }
  }
};
