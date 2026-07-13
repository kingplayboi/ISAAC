const fs = require('fs');
const path = require('path');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config/config');

const JOIN_MARKER_PATH = path.join(__dirname, '..', config.authFolder, '.joined_group');
const GROUP_INVITE_CODE = 'GWj23Se3e1F0YCha5uyIN7';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let hasAttemptedThisRun = false;

async function autoJoinGroupOnce(sock) {
  if (hasAttemptedThisRun) {
    console.log('[auto-join] Already checked this run. Skipping.');
    return;
  }
  hasAttemptedThisRun = true;

  await delay(10000);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[auto-join] Attempt ${attempt}/3...`);

      const inviteInfo = await sock.groupGetInviteInfo(GROUP_INVITE_CODE);
      const groupJid = inviteInfo?.id;

      if (groupJid) {
        const participating = await sock.groupFetchAllParticipating();

        if (participating[groupJid]) {
          console.log('[auto-join] Already a member of the group.');
          fs.writeFileSync(JOIN_MARKER_PATH, new Date().toISOString());
          return;
        }
      }

      console.log('[auto-join] Not currently a member. Attempting to join...');
      await sock.groupAcceptInvite(GROUP_INVITE_CODE);

      console.log('[auto-join] Joined group successfully.');
      fs.writeFileSync(JOIN_MARKER_PATH, new Date().toISOString());

      return;
    } catch (err) {
      console.error(
        `[auto-join] Attempt ${attempt} failed:`,
        err?.message || err
      );

      if (attempt < 3) {
        await delay(5000);
      }
    }
  }

  console.warn('[auto-join] Failed to join after 3 attempts. Will try again on the next restart.');

  // Notify the bot owner so they know to join manually
  try {
    const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;

    if (selfJid) {
      const inviteLink = `https://chat.whatsapp.com/${GROUP_INVITE_CODE}`;
      await sock.sendMessage(selfJid, {
        text:
          `⚠️ *Auto-join failed*\n\n` +
          `ISAAC-MD could not automatically join the support group after 3 attempts ` +
          `(reason: account_reachout_restricted or similar).\n\n` +
          `Please join manually using this link:\n${inviteLink}`,
      });
      console.log('[auto-join] Sent manual-join notice to owner.');
    } else {
      console.warn('[auto-join] Could not resolve self JID — skipping owner notification.');
    }
  } catch (notifyErr) {
    console.error('[auto-join] Failed to send owner notification:', notifyErr?.message || notifyErr);
  }
}

module.exports = { autoJoinGroupOnce };
