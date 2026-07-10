const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'antitag',
    description: 'Toggle deleting mass-tag spam messages from non-admins.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('antitag', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🏷️ *Antitag:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('antitag', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🏷️ *Antitag:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('antitag', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🏷️ *Antitag Status:* ${status}\n\n💡 Use \`.antitag on\` or \`.antitag off\` to change it.`
        });
    },
};
