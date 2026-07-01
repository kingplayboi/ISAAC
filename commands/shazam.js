/**
 * commands/shazam.js
 * -------------------
 * Identifies a song from a short audio or video clip using the AudD
 * music recognition API, then replies with the track info and links
 * to listen on Spotify / Apple Music.
 *
 * Usage:
 *   Reply to a voice note, audio file, or video with .shazam
 *   OR send a voice note / video directly with .shazam as the caption
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// TODO: move this into config/config.js if you want it out of source control.
const AUDD_API_TOKEN = '1ad87635d6a7e6e1ad8c2ccbe503d097';
const AUDD_ENDPOINT = 'https://api.audd.io/';

function extractMediaTarget(msg) {
  const m = msg.message;

  if (m?.audioMessage) return { type: 'audio', message: m, key: msg.key };
  if (m?.videoMessage) return { type: 'video', message: m, key: msg.key };

  const ctx = m?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (quoted?.audioMessage) {
    return {
      type: 'audio',
      message: quoted,
      key: {
        remoteJid: msg.key.remoteJid,
        id: ctx.stanzaId,
        fromMe: false,
        participant: ctx.participant,
      },
    };
  }
  if (quoted?.videoMessage) {
    return {
      type: 'video',
      message: quoted,
      key: {
        remoteJid: msg.key.remoteJid,
        id: ctx.stanzaId,
        fromMe: false,
        participant: ctx.participant,
      },
    };
  }

  return null;
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = {
  name: 'shazam',
  description: 'Identifies a song from an audio clip or video and gives you links to listen.',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = extractMediaTarget(msg);

    if (!target) {
      await sock.sendMessage(
        jid,
        { text: '🎧 Send or reply to a voice note, audio file, or short video with *.shazam* and I\'ll try to identify the song.' },
        { quoted: msg }
      );
      return;
    }

    await sock.sendMessage(jid, { react: { text: '🔎', key: msg.key } });

    let tmpInput, tmpAudio;
    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');

      const targetMsg = { key: target.key, message: target.message };
      const buffer = await downloadMediaMessage(
        targetMsg,
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      const tmpDir = os.tmpdir();
      const ext = target.type === 'video' ? 'mp4' : 'ogg';
      tmpInput = path.join(tmpDir, `shazam_in_${Date.now()}.${ext}`);
      tmpAudio = path.join(tmpDir, `shazam_out_${Date.now()}.mp3`);
      fs.writeFileSync(tmpInput, buffer);

      // A short sample is plenty for recognition and keeps the upload small.
      await execFileAsync('ffmpeg', [
        '-y', '-i', tmpInput,
        '-t', '20',
        '-vn',
        '-ac', '1',
        '-ar', '44100',
        '-f', 'mp3',
        tmpAudio,
      ]);

      const form = new FormData();
      form.append('api_token', AUDD_API_TOKEN);
      form.append('return', 'apple_music,spotify');
      form.append('file', new Blob([fs.readFileSync(tmpAudio)]), 'sample.mp3');

      const response = await fetch(AUDD_ENDPOINT, { method: 'POST', body: form });
      const data = await response.json();

      if (data.status !== 'success' || !data.result) {
        await sock.sendMessage(
          jid,
          { text: "😕 Couldn't identify that track. Try a clearer or longer clip." },
          { quoted: msg }
        );
        return;
      }

      const r = data.result;
      const spotifyUrl = r.spotify?.external_urls?.spotify;
      const appleUrl = r.apple_music?.url;
      const albumArt =
        r.spotify?.album?.images?.[0]?.url ||
        r.apple_music?.artwork?.url?.replace('{w}x{h}', '500x500');

      const captionLines = [
        `🎵 *${r.title}*`,
        `👤 *Artist:* ${r.artist}`,
        r.album ? `💿 *Album:* ${r.album}` : null,
        r.release_date ? `📅 *Released:* ${r.release_date}` : null,
        spotifyUrl ? `🟢 *Spotify:* ${spotifyUrl}` : null,
        appleUrl ? `🍎 *Apple Music:* ${appleUrl}` : null,
      ].filter(Boolean);
      const caption = captionLines.join('\n');

      if (albumArt) {
        const imgBuffer = await downloadBuffer(albumArt);
        await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
    } catch (error) {
      await sock.sendMessage(
        jid,
        { text: `⚠️ Something went wrong identifying the song: ${error.message}` },
        { quoted: msg }
      );
    } finally {
      [tmpInput, tmpAudio].forEach((f) => {
        if (f && fs.existsSync(f)) {
          try { fs.unlinkSync(f); } catch {}
        }
      });
    }
  },
};
