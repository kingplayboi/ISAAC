const axios = require('axios');

const API = process.env.HOST_API_URL;
const KEY = process.env.BOT_KEY;

let state = 'connecting';
let active = true;
let connectedAt = null;

async function beat() {
  if (!API || !KEY) return;
  try {
    const res = await axios.post(
      `${API}/api/heartbeat`,
      { state, connectedAt: connectedAt ? new Date(connectedAt).toISOString() : null },
      { headers: { 'x-bot-key': KEY }, timeout: 10000 }
    );
    active = res.data?.active !== false;
  } catch (e) {
    console.error('[HEARTBEAT]', e.message);
  }
}

function setState(s) {
  if (s === 'running' && state !== 'running') {
    connectedAt = Date.now();
  }
  if (s !== 'running') {
    connectedAt = null;
  }
  state = s;
  beat();
}

function start() {
  beat();
  const t = setInterval(beat, 60 * 1000);
  t.unref?.();
}

const isActive = () => active;

module.exports = { start, setState, isActive };
