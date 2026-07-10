const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'antilinkall',
    description: 'Toggle group-wide link deletion across all groups.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('antilinkall', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🔗 *Antilink (All Groups):* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('antilinkall', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🔗 *Antilink (All Groups):* DISABLED [🔴]' });
        }

        const status = settingsStore.get('antilinkall', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔗 *Antilink (All Groups) Status:* ${status}\n\n💡 Use \`.antilinkall on\` or \`.antilinkall off\` to change it.`
        });
    },
};
