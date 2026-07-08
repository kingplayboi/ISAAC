const config = require('../config/config');

module.exports = {
    name: 'antibot',
    description: 'Toggle detection/blocking of other bots in groups.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.ANTIBOT = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🤖 *Antibot:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.ANTIBOT = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🤖 *Antibot:* DISABLED [🔴]' });
        }

        const status = config.ANTIBOT ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🤖 *Antibot Status:* ${status}\n\n💡 Use \`.antibot on\` or \`.antibot off\` to change it.`
        });
    },
};
