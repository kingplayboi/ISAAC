/**
 * utils/isAdmin.js
 * -------------------
 * Shared helper for checking group admin status — for both the bot
 * itself and the message sender. Written to be resilient to WhatsApp's
 * LID (Linked ID) system, where a participant's identifier in group
 * metadata may be a @lid value rather than the classic phone-number
 * @s.whatsapp.net JID, depending on the group's addressing mode.
 */

function normalize(jid) {
  if (!jid) return null;
  const atIndex = jid.indexOf('@');
  if (atIndex === -1) return jid;
  const idPart = jid.slice(0, atIndex).split(':')[0]; // strip device suffix like ":48"
  const domain = jid.slice(atIndex);
  return idPart + domain;
}
function getBotIdentifiers(sock) {
  const ids = new Set();
  if (sock.user?.id) ids.add(normalize(sock.user.id));
  if (sock.user?.lid) ids.add(normalize(sock.user.lid));
  return ids;
}

function participantMatches(participant, identifierSet) {
  const candidateFields = [participant.id, participant.jid, participant.lid, participant.phoneNumber];
  return candidateFields.some((field) => field && identifierSet.has(normalize(field)));
}

function isAdminParticipant(participant) {
  return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

function isBotAdmin(sock, metadata) {
  const botIds = getBotIdentifiers(sock);
  const match = metadata.participants.find((p) => participantMatches(p, botIds));
  return isAdminParticipant(match);
}

function isSenderAdmin(metadata, senderJid) {
  const senderIds = new Set([normalize(senderJid)]);
  const match = metadata.participants.find((p) => participantMatches(p, senderIds));
  return isAdminParticipant(match);
}

module.exports = { isBotAdmin, isSenderAdmin, getBotIdentifiers };
