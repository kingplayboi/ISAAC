const config = require('../config/config');

module.exports = {
    name: 'menutype',
    description: 'Set the menu display style. Usage: .menutype list|button',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        const choice = args[0]?.toLowerCase();

        if (choice === 'list' || choice === 'button') {
            config.MENU_TYPE = choice;
            return await sock.sendMessage(msg.key.remoteJid, { text: `📋 *Menu Type:* set to *${choice}*` });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `📋 *Current Menu Type:* ${config.MENU_TYPE || 'list'}\n\n💡 Use \`.menutype list\` or \`.menutype button\` to change it.`
        });
    },
};
