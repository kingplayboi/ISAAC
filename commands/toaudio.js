/**
 * commands/toaudio.js
 * ---------------------
 * Extracts the audio track from a video and sends it back as an audio file.
 *
 * Usage:
 *   Reply to a video with .toaudio
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function getRepliedVideo(msg) {
  const m = msg.message;
  if (m?.videoMessage) return { message: m, key: msg.key };

  const ctx = m?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (quoted?.videoMessage) {
    return {
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

module.exports = {
  name: 'toaudio',
  description: 'Extracts the audio track from a video. Reply to a video with .toaudio',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getRepliedVideo(msg);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: '❌ Reply to a video with .toaudio to extract its audio.' },
        { quoted: msg }
      );
    }

    await sock.sendMessage(jid, { react: { text: '🎬', key: msg.key } });

    let tmpVideo, tmpAudio;
    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      const tmpDir = os.tmpdir();
      tmpVideo = path.join(tmpDir, `toaudio_in_${Date.now()}.mp4`);
      tmpAudio = path.join(tmpDir, `toaudio_out_${Date.now()}.m4a`);
      fs.writeFileSync(tmpVideo, buffer);

      await execFileAsync('ffmpeg', [
        '-y', '-i', tmpVideo,
        '-vn',
        '-c:a', 'aac',
        '-b:a', '128k',
        tmpAudio,
      ]);

      await sock.sendMessage(
        jid,
        {
          audio: fs.readFileSync(tmpAudio),
          mimetype: 'audio/mp4',
          ptt: false,
        },
        { quoted: msg }
      );

      await sock.sendMessage(jid, { react: { text: '', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error extracting audio: ${e.message}` }, { quoted: msg });
    } finally {
      [tmpVideo, tmpAudio].forEach((f) => {
        if (f && fs.existsSync(f)) {
          try { fs.unlinkSync(f); } catch {}
        }
      });
    }
  },
};
