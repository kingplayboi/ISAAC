const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const JOIN_MARKER_PATH = path.join(__dirname, '..', config.authFolder, '.joined_group');
const GROUP_INVITE_CODE = 'L3i1b9NLVlw55SriHTcxhH';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function autoJoinGroupOnce(sock) {
  // Already joined successfully before
  if (fs.existsSync(JOIN_MARKER_PATH)) {
    console.log('[auto-join] Join marker found. Skipping.');
    return;
  }

  // Give WhatsApp time to finish syncing after connection opens
  await delay(10000);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[auto-join] Attempt ${attempt}/3...`);

      // Resolve invite info
      const inviteInfo = await sock.groupGetInviteInfo(GROUP_INVITE_CODE);
      const groupJid = inviteInfo?.id;

      // Check if already a member
      if (groupJid) {
        const participating = await sock.groupFetchAllParticipating();

        if (participating[groupJid]) {
          console.log('[auto-join] Already a member of the group.');
          fs.writeFileSync(JOIN_MARKER_PATH, new Date().toISOString());
          return;
        }
      }

      // Join the group
      await sock.groupAcceptInvite(GROUP_INVITE_CODE);

      console.log('[auto-join] Joined group successfully.');

      fs.writeFileSync(JOIN_MARKER_PATH, new Date().toISOString());

      return;
    } catch (err) {
      console.error(
        `[auto-join] Attempt ${attempt} failed:`,
        err?.message || err
      );

      // Wait before retrying
      if (attempt < 3) {
        await delay(5000);
      }
    }
  }

  console.warn('[auto-join] Failed to join after 3 attempts. Will try again on the next restart.');
}

module.exports = { autoJoinGroupOnce };
