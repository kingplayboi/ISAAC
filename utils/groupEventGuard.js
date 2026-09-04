const { query } = require('./db');
const config = require('../config/config');
const { isBotAdmin, getBotIdentifiers } = require('./isAdmin');

const DEMOTE_DEFAULTS = { enabled: false, action: 'promote', warnLimit: 3, warns: {} };
const PROMOTE_DEFAULTS = { enabled: false, action: 'demote', warnLimit: 3, warns: {} };

// Checks ONLY the bot owner number — no dev-list exemption, by design.
function isPrimaryOwnerJid(jid) {
  if (!jid) return false;
  const number = String(jid).split('@')[0].split(':')[0];
  return number === config.ownerNumber;
}

async function getSettings(jid, key, defaults) {
  const { rows } = await query(
    'SELECT value FROM group_settings WHERE jid = $1 AND key = $2',
    [jid, key]
  );
  return rows[0] ? { ...defaults, ...rows[0].value } : { ...defaults };
}

async function setSettings(jid, key, patch, defaults) {
  const current = await getSettings(jid, key, defaults);
  const next = { ...current, ...patch };

  await query(
    `INSERT INTO group_settings (jid, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (jid, key) DO UPDATE SET value = EXCLUDED.value`,
    [jid, key, next]
  );

  return next;
}

 function registerGroupEventGuard(sock) {
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id: jid, participants, action, author } = update;

      if (!jid?.endsWith('@g.us')) return;
      if (action !== 'demote' && action !== 'promote') return;
      if (!author) return;

      const botIds = getBotIdentifiers(sock);
      if (botIds.has(author)) return; // skip the bot's own corrective actions

      const metadata = await sock.groupMetadata(jid);
      if (!isBotAdmin(sock, metadata)) return;

      if (action === 'demote') {
        if (isPrimaryOwnerJid(author)) return;

        const settings = await getSettings(jid, 'antidemote', DEMOTE_DEFAULTS);
        if (!settings.enabled) return;

        if (settings.action === 'promote') {
          await sock.groupParticipantsUpdate(jid, participants, 'promote');

          const demoterIsAdmin = metadata.participants.find(
            p => p.id === author && (p.admin === 'admin' || p.admin === 'superadmin')
          );
          if (demoterIsAdmin) {
            await sock.groupParticipantsUpdate(jid, [author], 'demote');
          }

          await sock.sendMessage(jid, {
            text: '🔄 Unauthorized demotion detected — victim re-promoted, demoter demoted.',
            mentions: [author, ...participants]
          });
        } else if (settings.action === 'remove') {
          await sock.groupParticipantsUpdate(jid, [author, ...participants], 'remove');
          await sock.sendMessage(jid, {
            text: '🚫 Unauthorized demotion detected — both users removed.',
            mentions: [author, ...participants]
          });
        } else if (settings.action === 'warn') {
          const warns = { ...settings.warns };
          warns[author] = (warns[author] || 0) + 1;

          if (warns[author] >= settings.warnLimit) {
            await sock.groupParticipantsUpdate(jid, [author], 'remove');
            warns[author] = 0;
            await sock.sendMessage(jid, {
              text: `🚫 @${author.split('@')[0]} reached the warn limit and was removed for unauthorized demotion.`,
              mentions: [author]
            });
          } else {
            await sock.groupParticipantsUpdate(jid, participants, 'promote');
            await sock.sendMessage(jid, {
              text: `⚠️ @${author.split('@')[0]} warned (${warns[author]}/${settings.warnLimit}) for unauthorized demotion. Victim re-promoted.`,
              mentions: [author, ...participants]
            });
          }

          await setSettings(jid, 'antidemote', { warns }, DEMOTE_DEFAULTS);
        }
      }

      if (action === 'promote') {
        if (isPrimaryOwnerJid(author)) return;

        const settings = await getSettings(jid, 'antipromote', PROMOTE_DEFAULTS);
        if (!settings.enabled) return;

        if (settings.action === 'demote') {
          await sock.groupParticipantsUpdate(jid, [author, ...participants], 'demote');
          await sock.sendMessage(jid, {
            text: '⬇️ Unauthorized promotion detected — both users demoted.',
            mentions: [author, ...participants]
          });
        } else if (settings.action === 'remove') {
          await sock.groupParticipantsUpdate(jid, [author, ...participants], 'remove');
          await sock.sendMessage(jid, {
            text: '🚫 Unauthorized promotion detected — both users removed.',
            mentions: [author, ...participants]
          });
        } else if (settings.action === 'warn') {
          const warns = { ...settings.warns };
          warns[author] = (warns[author] || 0) + 1;

          if (warns[author] >= settings.warnLimit) {
            await sock.groupParticipantsUpdate(jid, [author], 'remove');
            warns[author] = 0;
            await sock.sendMessage(jid, {
              text: `🚫 @${author.split('@')[0]} reached the warn limit and was removed for unauthorized promotion.`,
              mentions: [author]
            });
          } else {
            await sock.groupParticipantsUpdate(jid, participants, 'demote');
            await sock.sendMessage(jid, {
              text: `⚠️ @${author.split('@')[0]} warned (${warns[author]}/${settings.warnLimit}) for unauthorized promotion. Promoted user demoted.`,
              mentions: [author, ...participants]
            });
          }

          await setSettings(jid, 'antipromote', { warns }, PROMOTE_DEFAULTS);
        }
      }
    } catch (err) {
      console.error('[groupEventGuard] error handling group-participants.update:', err);
    }
  });
}

module.exports = { registerGroupEventGuard };
