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
    // WhatsApp frequently rejects groupAcceptInvite for a number that
    // previously left this exact group via this exact invite code — this
    // isn't something retrying will fix, so we still write the marker to
    // stop trying on every future restart, and just log it once clearly.
    console.warn(
      '[auto-join] Could not auto-join the group (often happens if this number previously left it). ' +
      'Skipping automatically from now on — join manually with a fresh invite link if you still want in.'
    );
    fs.writeFileSync(JOIN_MARKER_PATH, `failed: ${new Date().toISOString()}`);
  }
}

module.exports = { autoJoinGroupOnce };
