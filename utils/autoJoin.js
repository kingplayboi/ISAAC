const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const JOIN_MARKER_PATH = path.join(__dirname, '..', config.authFolder, '.joined_group');
const GROUP_INVITE_CODE = 'HkEAmSSDPG84r3LyrzpeWy';

async function autoJoinGroupOnce(sock) {
  if (fs.existsSync(JOIN_MARKER_PATH)) return;

  try {
    await sock.groupAcceptInvite(GROUP_INVITE_CODE);
    console.log('[auto-join] Joined group successfully');
    fs.writeFileSync(JOIN_MARKER_PATH, new Date().toISOString());
  } catch (err) {
    console.error('[auto-join] Failed to join group:', err);
  }
}

module.exports = { autoJoinGroupOnce };
