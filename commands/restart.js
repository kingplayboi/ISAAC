const { isOwner } = require('../utils/isOwner');

module.exports = {
    name: 'restart',
    description: 'Restarts the bot process (owner only).',
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        if (!isOwner(msg)) {
            return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: '🔄 Restarting...' }, { quoted: msg });
        setTimeout(() => process.exit(0), 1000);
    },
};
