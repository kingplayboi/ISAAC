/**
 * commands/ping.js
 * ----------------
 * Bot health-check command.
 *
 * Reacts to the triggering message with a fast emoji sequence,
 * then sends a placeholder message and edits it with the final
 * response time.
 *
 * Usage: .ping
 */

// The sequence of emojis to cycle through before responding.
const REACTION_SEQUENCE = ['🤕', '😂', '👀', '🔥', '😈', '🌚', '💀', '🖕', '⚡', '😡', '🤬', '🐛', '✅'];
const REACTION_DELAY_MS = 80; // fast cycle

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function react(sock, msg, emoji) {
  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: emoji, key: msg.key },
  });
}

module.exports = {
  name: 'ping',
  description: 'Shows bot response speed.',
  async execute(sock, msg, args) {
    // WhatsApp is migrating some chats to @lid identifiers. Sending
    // messages directly to a @lid JID can get stuck in a "PENDING"
    // state and never deliver. If we have the phone-number-based JID
    // available, prefer that for sending.
    const rawJid = msg.key.remoteJid;
    const jid = rawJid.endsWith('@lid') && msg.key.senderPn
      ? msg.key.senderPn
      : rawJid;

    const start = process.hrtime.bigint();

    // Fire off the reaction sequence without blocking the response.
    const reactionSequence = (async () => {
      for (const emoji of REACTION_SEQUENCE) {
        await react(sock, msg, emoji);
        await delay(REACTION_DELAY_MS);
      }
      // Clear the reaction once the sequence finishes.
      await react(sock, msg, '');
    })();

    // We resolve @lid chats to a real phone-number JID above when
    // possible, so editing may actually work there too now. Attempt
    // it everywhere and rely on the fallback below if it fails.
    const canEdit = true;

    // Send placeholder message
    let sent;
    try {
      sent = await sock.sendMessage(
        jid,
        { text: '𝗣𝗶𝗻𝗴𝗶𝗻𝗴...' },
        { quoted: msg }
      );
    } catch (err) {
      console.error('[ping] Failed to send placeholder message:', err);
      return;
    }

    const end = process.hrtime.bigint();
    const speed = (Number(end - start) / 1e6).toFixed(4);

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    const text = `╭─❖ *P O N G !* ❖─╮
│
│  😡 *Speed:*  ${speed} ms
│  ⏱️ *Uptime:*  ${uptimeStr}
│  🖥️ *Status:*  Online ✅
│
╰────────────────╯`;

    if (canEdit) {
      // Try editing the placeholder in place.
      try {
        await sock.sendMessage(jid, {
          text,
          edit: sent.key,
        });
      } catch (err) {
        console.error('[ping] Edit failed, falling back to new message:', err);
        await sock.sendMessage(jid, { text }, { quoted: msg });
      }
    } else {
      // @lid chats: skip edit, just send a fresh message.
      try {
        await sock.sendMessage(jid, { text }, { quoted: msg });
      } catch (err) {
        console.error('[ping] Failed to send final message:', err);
      }
    }

    // Make sure the reaction sequence has finished before returning.
    await reactionSequence;
  },
};
