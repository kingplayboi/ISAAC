/**
 * commands/spotify.js
 * ------------------
 * Downloads songs as MP3 using yt-search + yt-dlp + FFmpeg.
 * Compatible with Termux and Heroku.
 */

const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config/config');

module.exports = {
  name: 'spotify',
  description: 'Download songs as MP3',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ').trim();

    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text: `🎵 *Spotify Downloader*\n\nUsage:\n${config.prefix}spotify song name`
        },
        { quoted: msg }
      );
    }

    let filePath = null;

    try {
      await sock.sendMessage(jid, {
        react: {
          text: '🎵',
          key: msg.key
        }
      });

      const results = await yts(query);
      const video = results.videos?.[0];

      if (!video) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ No results found for *${query}*`
          },
          { quoted: msg }
        );
      }

      const title = video.title
        .replace(/[\/\\:*?"<>|]/g, '')
        .slice(0, 60);

      const url = video.url;

      await sock.sendMessage(
        jid,
        {
          text: `⬇️ Downloading: *${title}*`
        },
        { quoted: msg }
      );

      filePath = path.join(
        os.tmpdir(),
        `spotify_${Date.now()}.mp3`
      );

      await youtubedl(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        format: 'bestaudio',
        output: filePath,
        noWarnings: true,
        preferFreeFormats: true
      });

      if (!fs.existsSync(filePath)) {
        throw new Error('Audio file was not created.');
      }

      const stats = fs.statSync(filePath);

      if (stats.size < 1000) {
        throw new Error('Downloaded file is empty.');
      }

      await sock.sendMessage(
        jid,
        {
          audio: fs.readFileSync(filePath),
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`
        },
        { quoted: msg }
      );

      await sock.sendMessage(
        jid,
        {
          text: `✅ Successfully downloaded *${title}*`
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error('[SPOTIFY ERROR]', err);

      await sock.sendMessage(
        jid,
        {
          text: `❌ Error:\n${err.message}`
        },
        { quoted: msg }
      );

    } finally {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      }
    }
  }
};
