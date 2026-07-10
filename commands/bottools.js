/**
 * commands/bottools.js
 * ----------------------
 * Bot management commands: backup, reminder, task, tog, update, updatenow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const remindersPath = path.join(__dirname, '../config/reminders.json');
const tasksPath = path.join(__dirname, '../config/tasks.json');

function loadJSON(filePath) {
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return [];
}
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = [

  // ── BACKUP ──────────────────────────────────────────────────────────────────
  {
    name: 'backup',
    description: 'Create a backup of bot config and session data.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, { text: '💾 Creating backup...' }, { quoted: msg });

      try {
        const rootDir = path.join(__dirname, '..');
        const backupDir = path.join(rootDir, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

        const configDir = path.join(rootDir, 'config');
        const configFiles = {};
        if (fs.existsSync(configDir)) {
          for (const file of fs.readdirSync(configDir)) {
            if (file.endsWith('.json')) {
              configFiles[file] = JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf8'));
            }
          }
        }

        const backupData = {
          timestamp,
          config: configFiles,
          uptime: process.uptime()
        };

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

        await sock.sendMessage(jid, {
          document: fs.readFileSync(backupFile),
          mimetype: 'application/json',
          fileName: `isaac-backup-${timestamp}.json`,
          caption: '✅ Backup created successfully!'
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Backup failed: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── REMINDER ────────────────────────────────────────────────────────────────
  {
    name: 'reminder',
    description: 'Set a reminder. Usage: .reminder 10m Take a break',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const timeStr = args[0];
      const text = args.slice(1).join(' ');

      if (!timeStr || !text) {
        return sock.sendMessage(jid, { text: '❌ Usage: .reminder 10m Take a break\n(supports s/m/h, e.g. 30s, 10m, 2h)' }, { quoted: msg });
      }

      const match = timeStr.match(/^(\d+)(s|m|h)$/);
      if (!match) {
        return sock.sendMessage(jid, { text: '❌ Invalid time format. Use: 30s, 10m, or 2h' }, { quoted: msg });
      }

      const value = parseInt(match[1], 10);
      const unit = match[2];
      const ms = unit === 's' ? value * 1000 : unit === 'm' ? value * 60000 : value * 3600000;

      await sock.sendMessage(jid, { text: `⏰ Reminder set for ${timeStr}: "${text}"` }, { quoted: msg });

      setTimeout(async () => {
        await sock.sendMessage(jid, { text: `⏰ *Reminder:* ${text}`, mentions: msg.key.participant ? [msg.key.participant] : [] }, { quoted: msg });
      }, ms);
    }
  },

  // ── TASK ────────────────────────────────────────────────────────────────────
  {
    name: 'task',
    description: 'Manage a todo list. Usage: .task add <text> | .task list | .task done <number> | .task clear',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const sub = args[0]?.toLowerCase();
      const tasks = loadJSON(tasksPath);
      if (!Array.isArray(tasks)) {}

      let allTasks = loadJSON(tasksPath);
      if (!Array.isArray(allTasks)) allTasks = [];
      let chatTasks = allTasks.filter(t => t.jid === jid);

      if (sub === 'add') {
        const text = args.slice(1).join(' ');
        if (!text) return sock.sendMessage(jid, { text: '❌ Usage: .task add <text>' }, { quoted: msg });
        allTasks.push({ jid, text, done: false, id: Date.now() });
        saveJSON(tasksPath, allTasks);
        return sock.sendMessage(jid, { text: `✅ Task added: "${text}"` }, { quoted: msg });
      }

      if (sub === 'list') {
        if (!chatTasks.length) return sock.sendMessage(jid, { text: '📋 No tasks yet. Use .task add <text>' }, { quoted: msg });
        const list = chatTasks.map((t, i) => `${i + 1}. ${t.done ? '✅' : '⬜'} ${t.text}`).join('\n');
        return sock.sendMessage(jid, { text: `📋 *Task List:*\n\n${list}` }, { quoted: msg });
      }

      if (sub === 'done') {
        const num = parseInt(args[1], 10);
        if (!num || !chatTasks[num - 1]) return sock.sendMessage(jid, { text: '❌ Usage: .task done <number>' }, { quoted: msg });
        const taskToComplete = chatTasks[num - 1];
        const idx = allTasks.findIndex(t => t.id === taskToComplete.id);
        allTasks[idx].done = true;
        saveJSON(tasksPath, allTasks);
        return sock.sendMessage(jid, { text: `✅ Marked done: "${taskToComplete.text}"` }, { quoted: msg });
      }

      if (sub === 'clear') {
        allTasks = allTasks.filter(t => t.jid !== jid);
        saveJSON(tasksPath, allTasks);
        return sock.sendMessage(jid, { text: '🗑 All tasks cleared for this chat.' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '❌ Usage: .task add <text> | .task list | .task done <number> | .task clear' }, { quoted: msg });
    }
  },

  // ── UPDATE — check for git updates ─────────────────────────────────────────────
  {
    name: 'update',
    description: 'Check if bot updates are available on GitHub.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, { text: '🔍 Checking for updates...' }, { quoted: msg });

      try {
        execSync('git fetch', { cwd: path.join(__dirname, '..') });
        const behind = execSync('git rev-list HEAD..origin/main --count', { cwd: path.join(__dirname, '..') }).toString().trim();

        if (behind === '0') {
          await sock.sendMessage(jid, { text: '✅ Bot is already up to date!' }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { text: `🔔 ${behind} new commit(s) available!\nUse .updatenow to update.` }, { quoted: msg });
        }
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not check for updates: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── UPDATE NOW — pull latest changes and restart ──────────────────────────────
  {
    name: 'updatenow',
    description: 'Pull latest updates from GitHub and restart the bot.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, { text: '⬇️ Pulling latest updates...' }, { quoted: msg });

      try {
        const rootDir = path.join(__dirname, '..');
        execSync('git pull', { cwd: rootDir });
        execSync('npm install', { cwd: rootDir });

        await sock.sendMessage(jid, { text: '✅ Updated successfully! Restarting bot...' }, { quoted: msg });

        setTimeout(() => process.exit(0), 1500);
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Update failed: ' + e.message }, { quoted: msg });
      }
    }
  },

];
