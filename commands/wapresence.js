const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'wapresence',
    description: 'Toggle always-online WhatsApp presence.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('wapresence', true);
            await sock.sendPresenceUpdate('available');
            return await sock.sendMessage(msg.key.remoteJid, { text: '🟢 *Always Online:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('wapresence', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🟢 *Always Online:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('wapresence', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🟢 *Always Online Status:* ${status}\n\n💡 Use \`.wapresence on\` or \`.wapresence off\` to change it.`
        });
    },
};
