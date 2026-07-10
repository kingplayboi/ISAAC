const fs = require('fs');
const path = require('path');
const settingsStore = require('../utils/settingsStore');

const listPath = path.join(__dirname, '../config/badwords.json');

function load() {
    if (fs.existsSync(listPath)) return JSON.parse(fs.readFileSync(listPath, 'utf8'));
    return [];
}
function save(list) {
    fs.writeFileSync(listPath, JSON.stringify(list, null, 2));
}

module.exports = {
    name: 'badword',
    description: 'Manage the bad word filter. Usage: .badword on|off|add <word>|remove <word>|list',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        const sub = args[0]?.toLowerCase();

        if (sub === 'on') {
            settingsStore.set('badword', true);
            return sock.sendMessage(jid, { text: '🚫 *Bad Word Filter:* ENABLED [🟢]' });
        }
        if (sub === 'off') {
            settingsStore.set('badword', false);
            return sock.sendMessage(jid, { text: '🚫 *Bad Word Filter:* DISABLED [🔴]' });
        }
        if (sub === 'add') {
            const word = args[1]?.toLowerCase();
            if (!word) return sock.sendMessage(jid, { text: '❌ Usage: .badword add <word>' }, { quoted: msg });
            const list = load();
            if (!list.includes(word)) list.push(word);
            save(list);
            return sock.sendMessage(jid, { text: `✅ Added "${word}" to the bad word list.` }, { quoted: msg });
        }
        if (sub === 'remove') {
            const word = args[1]?.toLowerCase();
            if (!word) return sock.sendMessage(jid, { text: '❌ Usage: .badword remove <word>' }, { quoted: msg });
            save(load().filter(w => w !== word));
            return sock.sendMessage(jid, { text: `✅ Removed "${word}" from the bad word list.` }, { quoted: msg });
        }
        if (sub === 'list') {
            const list = load();
            return sock.sendMessage(jid, { text: list.length ? `📋 *Bad words:*\n${list.join(', ')}` : '📋 List is empty.' }, { quoted: msg });
        }

        const status = settingsStore.get('badword', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(jid, {
            text: `🚫 *Bad Word Filter Status:* ${status}\n\n💡 Use .badword on|off|add <word>|remove <word>|list`
        });
    },
};
