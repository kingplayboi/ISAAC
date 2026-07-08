const config = require('../config/config');

module.exports = {
    name: 'autobio',
    description: 'Toggle automatic bio/about text updates.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.AUTO_BIO = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '📝 *Auto Bio:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.AUTO_BIO = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '📝 *Auto Bio:* DISABLED [🔴]' });
        }

        const status = config.AUTO_BIO ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📝 *Auto Bio Status:* ${status}\n\n💡 Use \`.autobio on\` or \`.autobio off\` to change it.`
        });
    },
};
