const { isOwner } = require('../utils/isOwner');

module.exports = {
    name: 'logout',
    description: 'Logs the bot out of WhatsApp, requiring re-pairing (owner only, destructive).',
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        if (!isOwner(msg)) {
            return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
        }

        if (args[0] !== 'confirm') {
            return sock.sendMessage(jid, {
                text: '⚠️ This will log the bot out of WhatsApp completely. You will need to re-pair.\n\nType *.logout confirm* to proceed.'
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: '👋 Logging out...' }, { quoted: msg });
        await sock.logout();
    },
};
