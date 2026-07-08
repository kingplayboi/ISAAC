const { isOwner } = require('../utils/isOwner');

module.exports = {
    name: 'blocklist',
    description: 'Shows the bot\'s current WhatsApp blocklist (owner only).',
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        if (!isOwner(msg)) {
            return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
        }

        try {
            const list = await sock.fetchBlocklist();
            await sock.sendMessage(jid, {
                text: list.length ? `🚫 *Blocked contacts:*\n${list.map(j => `+${j.split('@')[0]}`).join('\n')}` : 'ℹ️ No blocked contacts.'
            }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(jid, { text: `❌ Could not fetch blocklist: ${error.message}` }, { quoted: msg });
        }
    },
};
