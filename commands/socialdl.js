/**
 * commands/socialdl.js
 * ---------------------
 * Download commands for TikTok, Instagram, Facebook, Twitter using free public APIs.
 *
 * Usage:
 *   .tiktok <url>
 *   .ig <url>
 *   .fb <url>
 *   .twitter <url>
 */

const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ error: raw }); }
      });
    }).on('error', reject);
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = [

  // ── TIKTOK ──────────────────────────────────────────────────────────────────
  {
    name: 'tiktok',
    aliases: ['tt'],
    description: 'Download TikTok video. Usage: .tiktok <url>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const url = args[0];

      if (!url || !url.includes('tiktok.com')) {
        return sock.sendMessage(jid, { text: '❌ Usage: .tiktok <TikTok URL>' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '⏳ Downloading TikTok video...' }, { quoted: msg });

      try {
        const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const res = await httpsGet(api);

        if (!res?.data?.play) throw new Error('Could not fetch video');

        const videoBuffer = await downloadBuffer(res.data.play);

        await sock.sendMessage(jid, {
          video: videoBuffer,
          caption: `🎵 *${res.data.title || 'TikTok Video'}*\n👤 ${res.data.author?.nickname || ''}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ TikTok download failed: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── INSTAGRAM ───────────────────────────────────────────────────────────────
  {
    name: 'ig',
    aliases: ['insta', 'instagram'],
    description: 'Download Instagram post/reel. Usage: .ig <url>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const url = args[0];

      if (!url || !url.includes('instagram.com')) {
        return sock.sendMessage(jid, { text: '❌ Usage: .ig <Instagram URL>' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '⏳ Downloading Instagram media...' }, { quoted: msg });

      try {
        const api = `https://api.tiklydown.eu.org/api/igdl?url=${encodeURIComponent(url)}`;
        const res = await httpsGet(api);

        const media = res?.result?.media || res?.media;
        if (!media || !media.length) throw new Error('Could not fetch media');

        for (const item of media) {
          const buffer = await downloadBuffer(item.url || item);
          const isVideo = (item.type === 'video') || (item.url || item).includes('.mp4');

          await sock.sendMessage(jid, isVideo
            ? { video: buffer, caption: '📸 Instagram' }
            : { image: buffer, caption: '📸 Instagram' }
          , { quoted: msg });
        }
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Instagram download failed: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── FACEBOOK ────────────────────────────────────────────────────────────────
  {
    name: 'fb',
    aliases: ['facebook'],
    description: 'Download Facebook video. Usage: .fb <url>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const url = args[0];

      if (!url || !url.includes('facebook.com') && !url.includes('fb.watch')) {
        return sock.sendMessage(jid, { text: '❌ Usage: .fb <Facebook URL>' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '⏳ Downloading Facebook video...' }, { quoted: msg });

      try {
        const api = `https://api.tiklydown.eu.org/api/fbdl?url=${encodeURIComponent(url)}`;
        const res = await httpsGet(api);

        const videoUrl = res?.result?.hd || res?.result?.sd || res?.hd || res?.sd;
        if (!videoUrl) throw new Error('Could not fetch video');

        const buffer = await downloadBuffer(videoUrl);

        await sock.sendMessage(jid, {
          video: buffer,
          caption: '📘 Facebook Video'
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Facebook download failed: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── TWITTER / X ─────────────────────────────────────────────────────────────
  {
    name: 'twitter',
    aliases: ['x', 'tw'],
    description: 'Download Twitter/X video. Usage: .twitter <url>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const url = args[0];

      if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) {
        return sock.sendMessage(jid, { text: '❌ Usage: .twitter <Twitter/X URL>' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '⏳ Downloading Twitter video...' }, { quoted: msg });

      try {
        const api = `https://api.tiklydown.eu.org/api/twitter?url=${encodeURIComponent(url)}`;
        const res = await httpsGet(api);

        const videoUrl = res?.result?.url || res?.url;
        if (!videoUrl) throw new Error('Could not fetch video');

        const buffer = await downloadBuffer(videoUrl);

        await sock.sendMessage(jid, {
          video: buffer,
          caption: '🐦 Twitter/X Video'
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Twitter download failed: ' + e.message }, { quoted: msg });
      }
    }
  },

];
