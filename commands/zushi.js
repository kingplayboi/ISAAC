/**
 * commands/zushi.js
 * --------------------
 * Allow specific commands to be used by non-admins/non-owner in this chat,
 * overriding the default owner/admin-only restriction on those commands.
 * Usage:
 *   .zushi add <command>      -> allow a command for everyone in this chat
 *   .zushi remove <command>   -> revoke it
 *   .zushi list               -> show allowed commands for this chat
 *
 * NOTE: your command dispatcher/permission check needs to consult
 * config/allowedCommands.json for the current chat before blocking a
 * restricted command, for this to actually take effect.
 */

const fs = require('fs');
const path = require('path');

const allowedPath = path.join(__dirname, '../config/allowedCommands.json');

function load() {
  if (fs.existsSync(allowedPath)) return JSON.parse(fs.readFileSync(allowedPath, 'utf8'));
  return {};
}
function save(data) {
  fs.writeFileSync(allowedPath, JSON.stringify(data, null, 2));
}

module.exports = {
  name: 'zushi',
  description: 'Allow specific commands for everyone in this chat. Usage: .zushi add|remove|list <command>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();
    const cmd = args[1]?.toLowerCase();

    const allowed = load();
    if (!allowed[jid]) allowed[jid] = [];

    if (sub === 'add') {
      if (!cmd) return sock.sendMessage(jid, { text: '❌ Usage: .zushi add <command>' }, { quoted: msg });
      if (!allowed[jid].includes(cmd)) allowed[jid].push(cmd);
      save(allowed);
      return sock.sendMessage(jid, { text: `✅ "${cmd}" is now allowed for everyone in this chat.` }, { quoted: msg });
    }

    if (sub === 'remove') {
      if (!cmd) return sock.sendMessage(jid, { text: '❌ Usage: .zushi remove <command>' }, { quoted: msg });
      allowed[jid] = allowed[jid].filter(c => c !== cmd);
      save(allowed);
      return sock.sendMessage(jid, { text: `✅ "${cmd}" removed from allowed list.` }, { quoted: msg });
    }

    if (sub === 'list') {
      const list = allowed[jid];
      return sock.sendMessage(jid, {
        text: list.length ? `📋 *Allowed commands in this chat:*\n${list.join(', ')}` : '📋 No extra commands allowed in this chat yet.'
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '❌ Usage: .zushi add|remove|list <command>' }, { quoted: msg });
  }
};
