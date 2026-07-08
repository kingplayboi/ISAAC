const config = require('../config/config');

module.exports = {
    name: 'antitag',
    description: 'Toggle protection against mass @tag abuse in groups.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.ANTITAG = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🏷️ *Antitag:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.ANTITAG = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🏷️ *Antitag:* DISABLED [🔴]' });
        }

        const status = config.ANTITAG ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🏷️ *Antitag Status:* ${status}\n\n💡 Use \`.antitag on\` or \`.antitag off\` to change it.`
        });
    },
};
