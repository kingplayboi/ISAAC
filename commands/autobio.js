const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autobio',
    description: 'Toggle automatic bio/about text updates.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('autobio', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '📝 *Auto Bio:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('autobio', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '📝 *Auto Bio:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('autobio', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📝 *Auto Bio Status:* ${status}\n\n💡 Use \`.autobio on\` or \`.autobio off\` to change it.`
        });
    },
};
