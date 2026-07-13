/**
 * commands/update.js
 * ---------------------
 * .update    — check if a newer version is available on GitHub (main branch).
 * .updatenow — owner-only: git pull, npm install if package.json changed,
 *              then restart the bot in place by spawning a fresh copy of
 *              itself and exiting — no external process manager required.
 *
 * Both commands only work where the bot has a real, writable git checkout
 * (Termux, Pterodactyl/VPS). Heroku dynos run from an immutable build slug
 * with no .git folder at runtime, so on Heroku these commands explain that
 * and point to `git push heroku main` instead of pretending to update.
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const root = path.join(__dirname, '..');
const gitDir = path.join(root, '.git');

function hasGit() {
  return fs.existsSync(gitDir);
}

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', timeout: 30000, ...opts }).trim();
}

module.exports = [
  {
    name: 'update',
    description: 'Check whether a newer version of the bot is available. Usage: .update',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (!hasGit()) {
        return sock.sendMessage(jid, {
          text: '❌ No local git checkout found — this looks like a Heroku deployment. ' +
                'To update, run `git push heroku main` from your dev machine instead.'
        }, { quoted: msg });
      }

      try {
        run('git fetch origin main --quiet');
        const behind = parseInt(run('git rev-list --count HEAD..origin/main'), 10);

        if (behind === 0) {
          return sock.sendMessage(jid, { text: '✅ You\'re already on the latest version.' }, { quoted: msg });
        }

        const latestMsg = run('git log -1 --format=%s origin/main');
        const latestShortHash = run('git rev-parse --short origin/main');

        await sock.sendMessage(jid, {
          text: `🔄 *Update available!*\n\n` +
                `You're ${behind} commit${behind === 1 ? '' : 's'} behind.\n` +
                `Latest: \`${latestShortHash}\` — ${latestMsg}\n\n` +
                `Run .updatenow to update.`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Failed to check for updates: ' + e.message }, { quoted: msg });
      }
    }
  },

  {
    name: 'updatenow',
    description: 'Owner-only: pull the latest version and restart the bot in place. Usage: .updatenow',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (!msg.key.fromMe) {
        return sock.sendMessage(jid, { text: '❌ Only the owner can run this.' }, { quoted: msg });
      }

      if (!hasGit()) {
        return sock.sendMessage(jid, {
          text: '❌ No local git checkout found — this looks like a Heroku deployment. ' +
                'To update, run `git push heroku main` from your dev machine instead.'
        }, { quoted: msg });
      }

      try {
        run('git fetch origin main --quiet');
        const behind = parseInt(run('git rev-list --count HEAD..origin/main'), 10);

        if (behind === 0) {
          return sock.sendMessage(jid, { text: '✅ Already on the latest version — nothing to update.' }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: `⏳ Pulling ${behind} commit${behind === 1 ? '' : 's'}...` }, { quoted: msg });

        const beforeHash = run('git rev-parse HEAD');
        run('git pull --ff-only');
        const afterHash = run('git rev-parse HEAD');

        const changedFiles = run(`git diff --name-only ${beforeHash} ${afterHash}`);
        if (changedFiles.split('\n').includes('package.json')) {
          await sock.sendMessage(jid, { text: '📦 package.json changed — installing dependencies (this may take a minute)...' }, { quoted: msg });
          run('npm install --omit=dev', { timeout: 300000 });
        }

        await sock.sendMessage(jid, { text: '✅ Updated. Restarting now — should reconnect in a few seconds.' }, { quoted: msg });

        // Spawn a fresh copy of the bot and exit this one. A short startup
        // delay on the child avoids both processes racing on the auth files.
        const child = spawn(process.execPath, [path.join(root, 'index.js')], {
          cwd: root,
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, ISAAC_RESTART_DELAY_MS: '4000' },
        });
        child.unref();

        setTimeout(() => process.exit(0), 1500);
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Update failed: ' + e.message }, { quoted: msg });
      }
    }
  },
];
