/**
 * commands/merge.js
 * -------------------
 * Merge multiple videos into one.
 * Usage:
 *   Reply to a video with .merge         -> adds it to the merge queue
 *   .merge done                          -> concatenates all queued videos
 *   .merge cancel                        -> clears the queue
 *
 * Requires: ffmpeg installed on the system
 * NOTE: fast concat uses -c copy, which requires the queued videos to
 * share the same codec/resolution. Mixed-format videos may fail to merge.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const queues = new Map(); // jid -> array of file paths

module.exports = {
  name: 'merge',
  description: 'Merge queued videos. Usage: reply to video with .merge, then .merge done',
  queues,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (sub === 'cancel') {
      const queue = queues.get(jid) || [];
      queue.forEach(p => { try { fs.unlinkSync(p); } catch {} });
      queues.delete(jid);
      return sock.sendMessage(jid, { text: '🗑 Merge queue cleared.' }, { quoted: msg });
    }

    if (sub === 'done') {
      const queue = queues.get(jid) || [];
      if (queue.length < 2) {
        return sock.sendMessage(jid, { text: '❌ Add at least 2 videos first by replying to each with .merge' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: `🔗 Merging ${queue.length} videos...` }, { quoted: msg });

      const listPath = path.join(os.tmpdir(), `merge_list_${Date.now()}.txt`);
      const outputPath = path.join(os.tmpdir(), `merge_out_${Date.now()}.mp4`);

      try {
        fs.writeFileSync(listPath, queue.map(p => `file '${p}'`).join('\n'));
        execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`);

        const buffer = fs.readFileSync(outputPath);
        await sock.sendMessage(jid, { video: buffer, caption: '✅ Merged video' }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Merge failed: ' + e.message }, { quoted: msg });
      } finally {
        queue.forEach(p => { try { fs.unlinkSync(p); } catch {} });
        [listPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch {} });
        queues.delete(jid);
      }
      return;
    }

    // Default: add replied video to queue
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.videoMessage) {
      return sock.sendMessage(jid, {
        text: '❌ Reply to a video with .merge to add it to the queue.\nWhen you have 2+ videos queued, run .merge done\nUse .merge cancel to clear the queue.'
      }, { quoted: msg });
    }

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }
      });

      const filePath = path.join(os.tmpdir(), `merge_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
      fs.writeFileSync(filePath, media);

      const queue = queues.get(jid) || [];
      queue.push(filePath);
      queues.set(jid, queue);

      await sock.sendMessage(jid, { text: `✅ Added to merge queue (${queue.length} video${queue.length > 1 ? 's' : ''}).\nReply to more videos, then send .merge done` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not add video: ' + e.message }, { quoted: msg });
    }
  }
};
