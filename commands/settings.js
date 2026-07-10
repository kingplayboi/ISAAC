/**
 * commands/settings.js
 * ----------------------
 * Shows a snapshot of the bot's current settings across security,
 * automation, and general behavior categories.
 * Usage: .settings
 */
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const settingsStore = require('../utils/settingsStore');

function onOff(value) {
    return value ? '✅ ON' : '❌ OFF';
}

module.exports = {
    name: 'settings',
    description: "Shows the bot's current settings.",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        // Antilink is per-group, so read it for the chat this command was run in.
        let antilinkOn = false;
        if (jid.endsWith('@g.us')) {
            const settingsPath = path.join(__dirname, '../config/groupSettings.json');
            if (fs.existsSync(settingsPath)) {
                const groupSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                antilinkOn = groupSettings[jid]?.antilink === true;
            }
        }

        const text = `╔══════════════════════╗
║     ⚙️  BOT SETTINGS
╚══════════════════════╝

*🔒 Security*
┣ AntiLink: ${onOff(antilinkOn)}
┣ AntiLinkAll: ${onOff(settingsStore.get('antilinkall', false))}
┣ AntiDelete: ${onOff(settingsStore.get('antidelete', false))}
┣ AntiCall: ${onOff(settingsStore.get('anticall', false))}
┣ AntiBot: ${onOff(settingsStore.get('antibot', false))}
┣ AntiTag: ${onOff(settingsStore.get('antitag', false))}
┗ BadWord: ${onOff(settingsStore.get('badword', false))}

*🤖 Automation*
┣ AutoRead: ${onOff(config.READ_COMMAND)}
┣ AutoLike: ${onOff(settingsStore.get('autolike', false))}
┣ AutoView: ${onOff(settingsStore.get('autoview', true))}
┣ AutoBio: ${onOff(settingsStore.get('autobio', false))}
┗ WelcomeGoodbye: ${onOff(settingsStore.get('welcomegoodbye', false))}

*💬 Bot Behaviour*
┣ GPTDM: ${onOff(settingsStore.get('gptdm', false))}
┣ Mode: 🌐 ${(config.WORK_TYPE || 'public').toUpperCase()}
┣ Prefix: ${config.prefix}
┣ MenuType: 📋 ${(config.MENU_TYPE || 'list').toUpperCase()}
┗ WAPresence: ${settingsStore.get('wapresence', false) ? '🟢 ONLINE' : '🔴 OFFLINE'}`;

        await sock.sendMessage(jid, { text }, { quoted: msg });
    },
};
