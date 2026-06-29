/**
 * commands/alive.js
 * -----------------
 * Checks whether the bot is alive.
 *
 * Usage: .alive
 */

module.exports = {
  name: 'alive',

  description: 'Checks if the bot is alive and running.',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const text = `
╭──〔 🤖 ISAAC BOT 〕──╮

🟢 *Status:* Alive & Running
👑 *Owner:* kingplayboi
⚡ *Version:* 1.0.0
⏱ *Uptime:* ${hours}h ${minutes}m ${seconds}s
📱 *Platform:* ${process.platform}

╰──────────────────╯
`.trim();

    await sock.sendMessage(
      jid,
      { text },
      { quoted: msg }
    );
  },
};
