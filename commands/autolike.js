const config = require('../config/config');

module.exports = {
    name: 'autolike',
    description: 'Toggle auto-reacting to contacts\' status updates.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.AUTO_LIKE_STATUS = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '❤️ *Auto Like Status:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.AUTO_LIKE_STATUS = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '❤️ *Auto Like Status:* DISABLED [🔴]' });
        }

        const status = config.AUTO_LIKE_STATUS ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❤️ *Auto Like Status:* ${status}\n\n💡 Use \`.autolike on\` or \`.autolike off\` to change it.`
        });
    },
};
