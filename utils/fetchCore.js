'use strict';

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const REPO   = 'kingplayboi/ISAAC-commands';
const BRANCH = 'main';
const headers = { Accept: 'application/vnd.github.v3+json' };

async function fetchFolder(repoFolder, localFolder) {
  try {
    const files = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${repoFolder}?ref=${BRANCH}`,
      { headers }
    ).then(r => r.json());

    if (!Array.isArray(files)) {
      console.warn(`⚠️ ${repoFolder}: unexpected response, skipping`);
      return;
    }
    if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder, { recursive: true });

    for (const file of files) {
      if (!file.name.endsWith('.js') && !file.name.endsWith('.json')) continue;
      if (!file.download_url) continue;
      const code = await fetch(file.download_url).then(r => r.text());
      fs.writeFileSync(path.join(localFolder, file.name), code, 'utf8');
      console.log(`  ↳ updated ${repoFolder}/${file.name}`);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to fetch ${repoFolder}:`, err.message);
  }
}

async function fetchCore() {
  console.log('🔄 Fetching latest commands from GitHub...');
  await fetchFolder('commands', path.join(__dirname, '..', 'commands'));
  console.log('✅ Commands fetched and updated successfully');
}

module.exports = { fetchCore };
