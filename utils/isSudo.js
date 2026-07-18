const fs = require('fs');
const path = require('path');
const { isOwner } = require('./isOwner');

const sudoPath = path.join(__dirname, '../config/sudoList.json');

function load() {
  if (fs.existsSync(sudoPath)) return JSON.parse(fs.readFileSync(sudoPath, 'utf8'));
  return [];
}
function save(list) {
  fs.writeFileSync(sudoPath, JSON.stringify(list, null, 2));
}

function isSudo(msg) {
  if (isOwner(msg)) return true;
  const senderJid = msg.key.participantPn || msg.key.participantAlt || msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
  const senderNumber = senderJid.split('@')[0].split(':')[0];
  return load().includes(senderNumber);
}

function addSudo(number) {
  const list = load();
  if (!list.includes(number)) list.push(number);
  save(list);
}
function removeSudo(number) {
  save(load().filter(n => n !== number));
}
function listSudo() {
  return load();
}
function clearSudo() {
  save([]);
}

module.exports = { isSudo, addSudo, removeSudo, listSudo, clearSudo };
