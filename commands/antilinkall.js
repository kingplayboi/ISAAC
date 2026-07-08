const config = require('../config/config');

module.exports = {
    name: 'antilinkall',
    description: 'Toggle group-wide link deletion across all groups.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.ANTILINK_ALL = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🔗 *Antilink (All Groups):* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.ANTILINK_ALL = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🔗 *Antilink (All Groups):* DISABLED [🔴]' });
        }

        const status = config.ANTILINK_ALL ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔗 *Antilink (All Groups) Status:* ${status}\n\n💡 Use \`.antilinkall on\` or \`.antilinkall off\` to change it.`
        });
    },
};
