const DEV_NUMBERS = ['254754574642', '254740832308'];

function isDev(msg) {
  const senderJid = msg.key.participantPn || msg.key.participantAlt || msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
  const senderNumber = senderJid.split('@')[0].split(':')[0];
  return DEV_NUMBERS.includes(senderNumber);
}

module.exports = { isDev };
