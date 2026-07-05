/**
 * commands/song.js
 * ------------------
 * Downloads a song from YouTube using youtube-dl-exec (bundles its own
 * yt-dlp binary via npm postinstall). Works on Termux and Heroku with
 * no manual setup beyond `npm install` — the binary comes with git push.
 */

const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'song',
  description: 'Download a song from YouTube. Usage: .song <song name>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return sock.sendMessage(jid, { text: '❌ Usage: .song <song name>' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: `🔍 Searching for "${query}"...` }, { quoted: msg });

    try {
      const search = await yts(query);
      const video = search.videos?.[0];
      if (!video) {
        return sock.sendMessage(jid, { text: '❌ No results found.' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: `⏳ Downloading: ${video.title} (${video.timestamp})` }, { quoted: msg });

      const filePath = path.join(__dirname, `${Date.now()}.mp3`);
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;

      await youtubedl(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: filePath,
        format: 'bestaudio',
      });

      if (!fs.existsSync(filePath)) {
        return sock.sendMessage(jid, { text: '❌ Download failed' }, { quoted: msg });
      }

      const buffer = fs.readFileSync(filePath);

      if (buffer.length < 1000) {
        fs.unlinkSync(filePath);
        return sock.sendMessage(jid, { text: '❌ Empty audio file' }, { quoted: msg });
      }

      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`,
        caption: `🎵 *${video.title}*\n⏱ ${video.timestamp} | 👁 ${video.views}`
      }, { quoted: msg });

      fs.unlinkSync(filePath);
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Song download failed: ' + e.message }, { quoted: msg });
    }
  }
};
