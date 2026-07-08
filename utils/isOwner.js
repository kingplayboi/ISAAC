/**
 * utils/isOwner.js
 * -----------------
 * Determines whether a message was sent by the bot owner.
 */
const config = require('../config/config');

function isOwner(msg) {
  if (msg.key.fromMe) return true;

  const senderJid = msg.key.participantPn || msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
const senderNumber = senderJid.split('@')[0].split(':')[0];

return senderNumber === config.ownerNumber;
}

module.exports = { isOwner };
