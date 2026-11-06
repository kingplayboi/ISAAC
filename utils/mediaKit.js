'use strict';

// Shared helpers for the ported command packs (mediaFx, creative, toolkit, groupFun).
// Needs: ffmpeg on the server (system ffmpeg, FFMPEG_PATH, or the ffmpeg-static package)
//        npm i jimp@0.22.12   (text rendering for logos, cards, subtitles)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const BRAND = 'ISAAC-MD';
const TAG = `_${BRAND}_`;
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

/* ───────────── ffmpeg ───────────── */
function ffmpegBin() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { const p = require('ffmpeg-static'); if (p) return p; } catch (_) {}
  return 'ffmpeg';
}
function ff(args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegBin(), args, { timeout, maxBuffer: 30 * 1024 * 1024 }, (err, _o, stderr) => {
      if (err) return reject(new Error(String(stderr || err.message).trim().split('\n').slice(-2).join(' ').slice(0, 220)));
      resolve();
    });
  });
}
function probe(file) {
  return new Promise((resolve) => {
    execFile(ffmpegBin(), ['-hide_banner', '-i', file], { timeout: 30000 }, (_e, _o, stderr) => {
      const s = String(stderr || '');
      const dim = s.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
      const dur = s.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      resolve({
        w: dim ? Number(dim[1]) : 0, h: dim ? Number(dim[2]) : 0,
        seconds: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0,
        hasAudio: /Audio:/.test(s), hasVideo: /Video:/.test(s)
      });
    });
  });
}
let ENCODERS = null;
function hasEncoder(name) {
  return new Promise((resolve) => {
    if (ENCODERS) return resolve(ENCODERS.includes(name));
    execFile(ffmpegBin(), ['-hide_banner', '-encoders'], { timeout: 20000, maxBuffer: 5 * 1024 * 1024 }, (_e, out) => {
      ENCODERS = String(out || ''); resolve(ENCODERS.includes(name));
    });
  });
}

/* ───────────── small utils ───────────── */
function makeDir(tag) {
  const d = path.join(os.tmpdir(), `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const rmDir = (d) => { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) {} };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (n) => Math.floor(Math.random() * n);
const num = (jid) => String(jid || '').split('@')[0].split(':')[0];
const pickOne = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const kb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const extFor = (mime) => (/webp/.test(mime) ? 'webp' : /png/.test(mime) ? 'png' : /gif/.test(mime) ? 'gif'
  : /mp4|video/.test(mime) ? 'mp4' : /ogg|opus/.test(mime) ? 'ogg' : /mpeg|mp3/.test(mime) ? 'mp3'
  : /audio/.test(mime) ? 'm4a' : 'jpg');

function parseTime(s) {
  s = String(s || '').trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  let m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (m) return (Number(m[1] || 0) * 3600) + Number(m[2]) * 60 + Number(m[3]);
  m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  return null;
}
const stamp = (sec) => { sec = Math.round(sec); const mm = Math.floor(sec / 60), ss = sec % 60; return `${mm}:${String(ss).padStart(2, '0')}`; };

function seedFrom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dayKey = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

/* ───────────── message context (sock, msg, args → easy helpers) ───────────── */
function unwrap(message) {
  let x = message || {};
  for (let i = 0; i < 5; i++) {
    const inner = x.ephemeralMessage?.message || x.viewOnceMessage?.message || x.viewOnceMessageV2?.message ||
      x.viewOnceMessageV2Extension?.message || x.documentWithCaptionMessage?.message;
    if (!inner) break;
    x = inner;
  }
  return x;
}
const MEDIA_KEYS = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
function mediaInfo(message) {
  const u = unwrap(message);
  for (const k of MEDIA_KEYS) if (u[k]) return { kind: k, mime: String(u[k].mimetype || '').toLowerCase() };
  return null;
}
function textOf(message) {
  const u = unwrap(message);
  return u.conversation || u.extendedTextMessage?.text || u.imageMessage?.caption || u.videoMessage?.caption || u.documentMessage?.caption || '';
}
function ctxInfoOf(message) {
  const u = unwrap(message);
  for (const k of Object.keys(u)) { const ci = u[k] && typeof u[k] === 'object' && u[k].contextInfo; if (ci) return ci; }
  return {};
}

function ctx(sock, msg, args = []) {
  const chat = msg.key.remoteJid;
  const isGroup = String(chat).endsWith('@g.us');
  const me = String(sock.user?.id || '').replace(/:\d+@/, '@');
  const sender = msg.key.fromMe ? me : (msg.key.participant || chat);
  const ci = ctxInfoOf(msg.message);
  const body = textOf(msg.message);
  // The loader's args are the truth (they already exclude the prefix and the command word, even for ". cmd").
  // The raw body is only used to keep line breaks when it agrees with the args.
  const argText = (args || []).join(' ').trim();
  let text = argText;
  if (argText) {
    const cand = body.replace(/^\s*[^\w\s]{0,3}\s*\S+\s*/, '').trim();
    if (cand.replace(/\s+/g, ' ') === argText.replace(/\s+/g, ' ')) text = cand;
  }
  const quotedMsg = ci.quotedMessage ? unwrap(ci.quotedMessage) : null;

  const c = {
    sock, msg, chat, isGroup, sender, args,
    pushName: msg.pushName || '',
    text,
    mentions: ci.mentionedJid || [],
    quotedSender: ci.participant || null,
    quotedText: quotedMsg ? textOf(quotedMsg) : '',
    reply: (t) => sock.sendMessage(chat, { text: t }, { quoted: msg }),
    send: (content, opts = {}) => sock.sendMessage(chat, content, { quoted: msg, ...opts })
  };

  // the media this command points at: the replied-to message first, otherwise the message itself
  c.media = () => {
    const q = quotedMsg && mediaInfo(quotedMsg);
    if (q) return { ...q, wa: { key: { remoteJid: chat, id: ci.stanzaId, fromMe: false, participant: ci.participant }, message: quotedMsg } };
    const d = mediaInfo(msg.message);
    if (d) return { ...d, wa: msg };
    return null;
  };
  c.download = async (t) => {
    const buf = await downloadMediaMessage(t.wa, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    if (!buf || !buf.length) throw new Error('could not download the media');
    return buf;
  };
  c.needMedia = async (kinds, usage) => {
    const t = c.media();
    if (!t || !kinds.test(t.mime)) { await c.reply(usage); return null; }
    return { t, mime: t.mime, buf: await c.download(t) };
  };
  c.isOwner = () => { try { return !!require('./isOwner').isOwner(msg); } catch (_) { return false; } };
  c.isAdmin = async () => {
    if (!isGroup) return false;
    try { const { isSenderAdmin } = require('./isAdmin'); return !!isSenderAdmin(await sock.groupMetadata(chat), sender); } catch (_) { return false; }
  };
  return c;
}

/* ───────────── network helpers ───────────── */
const why = (e) => (e && e.response && e.response.status ? 'HTTP ' + e.response.status : (e && e.message) || 'unknown error');
// GET with a couple of retries for temporary server trouble (5xx / 429 / timeouts)
async function getRetry(url, opts = {}, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await axios.get(url, opts); }
    catch (e) {
      last = e;
      const st = e.response && e.response.status;
      if (st && st < 500 && st !== 429) break;
      if (i < tries - 1) await sleep(1500 * (i + 1));
    }
  }
  throw last;
}

/* ───────────── songs through the Keith API (same one your .spotify uses) ───────────── */
async function songAudio(queryOrVideo) {
  const yts = require('yt-search');
  const { KEITH_BASE } = require('../config/apis');
  let v;
  try { v = typeof queryOrVideo === 'string' ? ((await yts(queryOrVideo)).videos || [])[0] : queryOrVideo; }
  catch (e) { throw new Error('song search failed (' + why(e) + ')'); }
  if (!v) throw new Error('song not found');
  let url;
  try {
    const r = await getRetry(`${KEITH_BASE}/download/audio?url=${encodeURIComponent(v.url)}`, { timeout: 60000 });
    url = r.data && r.data.result;
  } catch (e) { throw new Error('song download service failed (' + why(e) + ')'); }
  if (!url || typeof url !== 'string') throw new Error('the song download service returned no audio');
  try {
    const a = await getRetry(url, { responseType: 'arraybuffer', timeout: 120000, headers: { 'User-Agent': UA } });
    return { buf: Buffer.from(a.data), video: v };
  } catch (e) { throw new Error('song file download failed (' + why(e) + ')'); }
}

async function profilePic(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    if (!url) return null;
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, headers: { 'User-Agent': UA } });
    return Buffer.from(r.data);
  } catch (_) { return null; }
}

/* ───────────── audio ───────────── */
async function makeVoiceNote(buf, mime) {
  const dir = makeDir('vn');
  try {
    const inFile = path.join(dir, `in.${extFor(mime)}`);
    fs.writeFileSync(inFile, buf);
    const out = path.join(dir, 'out.ogg');
    const base = ['-y', '-i', inFile, '-vn', '-map_metadata', '-1', '-ar', '48000', '-ac', '1'];
    const tries = [];
    if (await hasEncoder('libopus')) tries.push(['-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'voip', '-f', 'ogg']);
    tries.push(['-c:a', 'opus', '-strict', '-2', '-b:a', '32k', '-f', 'ogg']);
    let lastErr = null;
    for (const t of tries) {
      try {
        try { fs.rmSync(out, { force: true }); } catch (_) {}
        await ff([...base, ...t, out]);
        const info = await probe(out);
        const raw = fs.readFileSync(out);
        if (raw.subarray(0, 4).toString('latin1') === 'OggS' && raw.length > 800 && info.seconds > 0.2) return { buf: raw, seconds: Math.max(1, Math.round(info.seconds)) };
        lastErr = new Error('the converted file was empty');
      } catch (e) { lastErr = e; }
    }
    throw new Error('this server\'s ffmpeg cannot make voice notes (' + String(lastErr && lastErr.message).slice(0, 120) + ')');
  } finally { rmDir(dir); }
}

// applies an ffmpeg audio filter to a replied voice note / song / video and sends it back
async function audioJob(c, af, label, note) {
  const x = await c.needMedia(/audio|video/, 'Reply to a *voice note, song or video* with this command.');
  if (!x) return;
  await c.reply(`${label} _working..._`);
  const dir = makeDir('afx');
  try {
    const inFile = path.join(dir, `in.${extFor(x.mime)}`); fs.writeFileSync(inFile, x.buf);
    if (/video/.test(x.mime)) {
      const info = await probe(inFile);
      if (!info.hasAudio) return c.reply('⚠️ That video has no sound to change.');
      const out = path.join(dir, 'out.mp4');
      await ff(['-y', '-i', inFile, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '160k', '-movflags', 'faststart', out]);
      await c.send({ video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `${label} ${note || ''}`.trim() });
    } else if (/ogg|opus/.test(x.mime)) {
      const out = path.join(dir, 'out.ogg');
      const common = ['-y', '-i', inFile, '-vn', '-map_metadata', '-1', '-af', af, '-ar', '48000', '-ac', '1'];
      try { await ff([...common, '-c:a', 'libopus', '-b:a', '32k', '-application', 'voip', '-f', 'ogg', out]); }
      catch (_) { await ff([...common, '-c:a', 'opus', '-strict', '-2', '-b:a', '32k', '-f', 'ogg', out]); }
      const oi = await probe(out);
      await c.send({ audio: fs.readFileSync(out), mimetype: 'audio/ogg; codecs=opus', ptt: true, seconds: Math.max(1, Math.round(oi.seconds || 1)) });
    } else {
      const out = path.join(dir, 'out.mp3');
      await ff(['-y', '-i', inFile, '-vn', '-af', af, '-c:a', 'libmp3lame', '-b:a', '192k', out]);
      await c.send({ audio: fs.readFileSync(out), mimetype: 'audio/mpeg', ptt: false, fileName: 'audio.mp3' });
    }
  } finally { rmDir(dir); }
}

/* ───────────── text → image layers ─────────────
   Primary: Jimp 0.x (smooth Open Sans). If Jimp is missing, the wrong version, or breaks on this host,
   a built-in 5x7 pixel font is used instead so the commands never fail because of text rendering. */
let JIMP_OK = null;
function jimpFailed(e) {
  if (JIMP_OK === null) {
    JIMP_OK = false;
    console.error('[mediaKit] Jimp text rendering failed, using the built-in font instead. Reason:', (e && e.stack) || e);
  }
}

// classic 5x7 ASCII font (0x20..0x7E), 5 columns per glyph, bit0 = top row
const FONT5X7 = [
  [0x00,0x00,0x00,0x00,0x00],[0x00,0x00,0x5f,0x00,0x00],[0x00,0x07,0x00,0x07,0x00],[0x14,0x7f,0x14,0x7f,0x14],[0x24,0x2a,0x7f,0x2a,0x12],[0x23,0x13,0x08,0x64,0x62],[0x36,0x49,0x55,0x22,0x50],[0x00,0x05,0x03,0x00,0x00],
  [0x00,0x1c,0x22,0x41,0x00],[0x00,0x41,0x22,0x1c,0x00],[0x14,0x08,0x3e,0x08,0x14],[0x08,0x08,0x3e,0x08,0x08],[0x00,0x50,0x30,0x00,0x00],[0x08,0x08,0x08,0x08,0x08],[0x00,0x60,0x60,0x00,0x00],[0x20,0x10,0x08,0x04,0x02],
  [0x3e,0x51,0x49,0x45,0x3e],[0x00,0x42,0x7f,0x40,0x00],[0x42,0x61,0x51,0x49,0x46],[0x21,0x41,0x45,0x4b,0x31],[0x18,0x14,0x12,0x7f,0x10],[0x27,0x45,0x45,0x45,0x39],[0x3c,0x4a,0x49,0x49,0x30],[0x01,0x71,0x09,0x05,0x03],
  [0x36,0x49,0x49,0x49,0x36],[0x06,0x49,0x49,0x29,0x1e],[0x00,0x36,0x36,0x00,0x00],[0x00,0x56,0x36,0x00,0x00],[0x08,0x14,0x22,0x41,0x00],[0x14,0x14,0x14,0x14,0x14],[0x00,0x41,0x22,0x14,0x08],[0x02,0x01,0x51,0x09,0x06],
  [0x32,0x49,0x79,0x41,0x3e],[0x7e,0x11,0x11,0x11,0x7e],[0x7f,0x49,0x49,0x49,0x36],[0x3e,0x41,0x41,0x41,0x22],[0x7f,0x41,0x41,0x22,0x1c],[0x7f,0x49,0x49,0x49,0x41],[0x7f,0x09,0x09,0x09,0x01],[0x3e,0x41,0x49,0x49,0x7a],
  [0x7f,0x08,0x08,0x08,0x7f],[0x00,0x41,0x7f,0x41,0x00],[0x20,0x40,0x41,0x3f,0x01],[0x7f,0x08,0x14,0x22,0x41],[0x7f,0x40,0x40,0x40,0x40],[0x7f,0x02,0x0c,0x02,0x7f],[0x7f,0x04,0x08,0x10,0x7f],[0x3e,0x41,0x41,0x41,0x3e],
  [0x7f,0x09,0x09,0x09,0x06],[0x3e,0x41,0x51,0x21,0x5e],[0x7f,0x09,0x19,0x29,0x46],[0x46,0x49,0x49,0x49,0x31],[0x01,0x01,0x7f,0x01,0x01],[0x3f,0x40,0x40,0x40,0x3f],[0x1f,0x20,0x40,0x20,0x1f],[0x3f,0x40,0x38,0x40,0x3f],
  [0x63,0x14,0x08,0x14,0x63],[0x07,0x08,0x70,0x08,0x07],[0x61,0x51,0x49,0x45,0x43],[0x00,0x7f,0x41,0x41,0x00],[0x02,0x04,0x08,0x10,0x20],[0x00,0x41,0x41,0x7f,0x00],[0x04,0x02,0x01,0x02,0x04],[0x40,0x40,0x40,0x40,0x40],
  [0x00,0x01,0x02,0x04,0x00],[0x20,0x54,0x54,0x54,0x78],[0x7f,0x48,0x44,0x44,0x38],[0x38,0x44,0x44,0x44,0x20],[0x38,0x44,0x44,0x48,0x7f],[0x38,0x54,0x54,0x54,0x18],[0x08,0x7e,0x09,0x01,0x02],[0x0c,0x52,0x52,0x52,0x3e],
  [0x7f,0x08,0x04,0x04,0x78],[0x00,0x44,0x7d,0x40,0x00],[0x20,0x40,0x44,0x3d,0x00],[0x7f,0x10,0x28,0x44,0x00],[0x00,0x41,0x7f,0x40,0x00],[0x7c,0x04,0x18,0x04,0x78],[0x7c,0x08,0x04,0x04,0x78],[0x38,0x44,0x44,0x44,0x38],
  [0x7c,0x14,0x14,0x14,0x08],[0x08,0x14,0x14,0x18,0x7c],[0x7c,0x08,0x04,0x04,0x08],[0x48,0x54,0x54,0x54,0x20],[0x04,0x3f,0x44,0x40,0x20],[0x3c,0x40,0x40,0x20,0x7c],[0x1c,0x20,0x40,0x20,0x1c],[0x3c,0x40,0x30,0x40,0x3c],
  [0x44,0x28,0x10,0x28,0x44],[0x0c,0x50,0x50,0x50,0x3c],[0x44,0x64,0x54,0x4c,0x44],[0x00,0x08,0x36,0x41,0x00],[0x00,0x00,0x7f,0x00,0x00],[0x00,0x41,0x36,0x08,0x00],[0x10,0x08,0x08,0x10,0x08]
];
const BMP_SCALE = { 128: 12, 64: 6, 32: 3 };

const CRC_T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', require('zlib').deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}
const foldAscii = (s) => String(s).replace(/[‘’‚`´]/g, "'").replace(/[“”„]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E\n]/g, '?');

function bitmapLayer(text, width, sizes, maxHeight, { pad = 10, outline = false } = {}) {
  text = foldAscii(text);
  const maxW = width - pad * 2;
  let k = BMP_SCALE[sizes[sizes.length - 1]] || 3, lines = [];
  for (const s of sizes) {
    k = BMP_SCALE[s] || 3;
    const perLine = Math.max(1, Math.floor(maxW / (6 * k)));
    lines = [];
    for (const para of text.split('\n')) {
      let cur = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let w = word;
        while (w.length > perLine) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, perLine)); w = w.slice(perLine); }
        if ((cur ? cur.length + 1 : 0) + w.length > perLine) { if (cur) lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
      }
      lines.push(cur);
    }
    if (!lines.length) lines = [''];
    if (lines.length * 9 * k <= maxHeight - pad * 2) break;
  }
  const r = outline ? Math.max(2, Math.round(k * 0.6)) : 0;
  const lh = 9 * k, H = Math.max(2, lines.length * lh + pad * 2 + r * 2), W = width;
  const buf = Buffer.alloc(W * H * 4);
  const rect = (x, y, w, h, R, G, B) => {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
      const o = (yy * W + xx) * 4; buf[o] = R; buf[o + 1] = G; buf[o + 2] = B; buf[o + 3] = 255;
    }
  };
  for (const pass of outline ? [0, 1] : [1]) {
    lines.forEach((ln, li) => {
      const lw = ln.length * 6 * k - k;
      const x0 = Math.round((W - lw) / 2), y0 = pad + r + li * lh;
      for (let ci = 0; ci < ln.length; ci++) {
        const g = FONT5X7[ln.charCodeAt(ci) - 32] || FONT5X7[31];
        for (let col = 0; col < 5; col++) for (let row = 0; row < 7; row++) {
          if (!(g[col] >> row & 1)) continue;
          const x = x0 + ci * 6 * k + col * k, y = y0 + row * k;
          if (pass === 0) rect(x - r, y - r, k + r * 2, k + r * 2, 0, 0, 0); else rect(x, y, k, k, 255, 255, 255);
        }
      }
    });
  }
  return { png: encodePng(W, H, buf), h: H, size: sizes[0] };
}

async function textLayer(text, width, sizes = [128, 64, 32], maxHeight = 400) {
  if (JIMP_OK !== false) {
    try {
      const Jimp = require('jimp');
      const key = { 128: Jimp.FONT_SANS_128_WHITE, 64: Jimp.FONT_SANS_64_WHITE, 32: Jimp.FONT_SANS_32_WHITE };
      const pad = 10, maxW = width - pad * 2;
      let font = null, size = sizes[sizes.length - 1];
      for (const s of sizes) {
        size = s; font = await Jimp.loadFont(key[s]);
        if (Jimp.measureTextHeight(font, text, maxW) <= maxHeight - pad * 2) break;
      }
      const th = Jimp.measureTextHeight(font, text, maxW);
      const img = new Jimp(width, th + pad * 2, 0x00000000);
      img.print(font, pad, pad, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxW);
      const out = { png: await img.getBufferAsync(Jimp.MIME_PNG), h: th + pad * 2, size };
      JIMP_OK = true;
      return out;
    } catch (e) { jimpFailed(e); }
  }
  return bitmapLayer(text, width, sizes, maxHeight, { pad: 10 });
}

// white text with a black outline (subtitles, lyrics)
async function textStrip(text, width, { maxHeight = 400, sizes = [64, 32] } = {}) {
  if (JIMP_OK !== false) {
    try {
      const Jimp = require('jimp');
      const fontsW = { 64: await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE), 32: await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE) };
      const fontsB = { 64: await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK), 32: await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK) };
      const pad = 20, maxW = width - pad * 2;
      let size = sizes[sizes.length - 1];
      for (const s of sizes) { size = s; if (Jimp.measureTextHeight(fontsW[s], text, maxW) <= maxHeight - pad * 2) break; }
      const th = Jimp.measureTextHeight(fontsW[size], text, maxW);
      const img = new Jimp(width, th + pad * 2, 0x00000000);
      const opts = { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER };
      for (const [dx, dy] of [[-3, -3], [-3, 0], [-3, 3], [0, -3], [0, 3], [3, -3], [3, 0], [3, 3]]) img.print(fontsB[size], pad + dx, pad + dy, opts, maxW);
      img.print(fontsW[size], pad, pad, opts, maxW);
      const out = { png: await img.getBufferAsync(Jimp.MIME_PNG), h: th + pad * 2 };
      JIMP_OK = true;
      return out;
    } catch (e) { jimpFailed(e); }
  }
  const r = bitmapLayer(text, width, sizes, maxHeight, { pad: 20, outline: true });
  return { png: r.png, h: r.h };
}

/* ───────────── neon themes, logo and card renderers ───────────── */
const THEMES = {
  cyan: { c: [0, 229, 255], bg: [6, 10, 28], bg2: [20, 8, 60] },
  magenta: { c: [255, 46, 200], bg: [18, 4, 28], bg2: [50, 6, 70] },
  green: { c: [57, 255, 120], bg: [2, 14, 10], bg2: [4, 40, 30] },
  gold: { c: [255, 196, 46], bg: [14, 10, 4], bg2: [50, 30, 6] },
  red: { c: [255, 60, 70], bg: [16, 4, 6], bg2: [60, 8, 14] },
  blue: { c: [70, 140, 255], bg: [4, 8, 24], bg2: [10, 30, 90] },
  purple: { c: [178, 102, 255], bg: [10, 4, 24], bg2: [40, 10, 80] },
  orange: { c: [255, 138, 31], bg: [16, 8, 2], bg2: [60, 24, 4] }
};
const COLOR_WORDS = { red: '#ff3c46', orange: '#ff8a1f', yellow: '#ffd23c', gold: '#ffc42e', green: '#2fd45f', teal: '#14b8a6', cyan: '#00e5ff', blue: '#468cff', navy: '#0b1f5c', purple: '#9b5cff', violet: '#8a2be2', pink: '#ff6fb5', magenta: '#ff2ec8', brown: '#8b5a2b', black: '#0a0a0f', white: '#ffffff', grey: '#808080', gray: '#808080', silver: '#c0c0c0', maroon: '#800000', lime: '#a3e635' };
function parseHex(s) {
  s = String(s || '').trim().toLowerCase();
  if (COLOR_WORDS[s]) s = COLOR_WORDS[s];
  const m = s.match(/^#?([0-9a-f]{6})$/) || s.match(/^#?([0-9a-f]{3})$/);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map(ch => ch + ch).join('') : m[1];
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
const hx = (col) => '0x' + col.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function bgChain(w, h, A, B, grid = true, col = '0xffffff') {
  return `format=gbrp,geq=r='${A[0]}+(${B[0] - A[0]})*X/W':g='${A[1]}+(${B[1] - A[1]})*X/W':b='${A[2]}+(${B[2] - A[2]})*(1-Y/H)'` +
    (grid ? `,drawgrid=w=${Math.round(h / 8)}:h=${Math.round(h / 8)}:t=1:c=${col}@0.06` : '') + ',vignette=PI/4,format=rgba';
}

// logo / banner: glowing name + tagline with corner brackets
async function futuristicImage(dir, { w, h, name, tagline, theme, nameSizes }) {
  const T = THEMES[theme] || THEMES.cyan;
  const nameL = await textLayer(name, Math.round(w * 0.86), nameSizes, Math.round(h * 0.6));
  const tagL = tagline ? await textLayer(tagline, Math.round(w * 0.8), [32], Math.round(h * 0.25)) : null;
  const nameF = path.join(dir, 'name.png'); fs.writeFileSync(nameF, nameL.png);
  const inputs = ['-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:d=1`, '-i', nameF];
  let tagF = null;
  if (tagL) { tagF = path.join(dir, 'tag.png'); fs.writeFileSync(tagF, tagL.png); inputs.push('-i', tagF); }
  const gap = tagL ? 14 : 0;
  const blockH = nameL.h + gap + (tagL ? tagL.h : 0);
  const ny = Math.round((h - blockH) / 2), ty = ny + nameL.h + gap;
  const col = hx(T.c);
  const [cr, cg, cb] = T.c.map(v => (v / 255).toFixed(3));
  const tint = `colorchannelmixer=rr=${cr}:rg=0:rb=0:gr=0:gg=${cg}:gb=0:br=0:bg=0:bb=${cb}`;
  const bw = Math.round(Math.min(w, h) * 0.07), th = Math.max(3, Math.round(h * 0.008));
  const mg = Math.round(Math.min(w, h) * 0.07);
  let fc =
    `[0:v]format=gbrp,geq=r='${T.bg[0]}+(${T.bg2[0] - T.bg[0]})*X/W':g='${T.bg[1]}+(${T.bg2[1] - T.bg[1]})*X/W':b='${T.bg[2]}+(${T.bg2[2] - T.bg[2]})*(1-Y/H)',` +
    `drawgrid=w=${Math.round(h / 8)}:h=${Math.round(h / 8)}:t=1:c=${col}@0.07,vignette=PI/4,format=rgba[bg];` +
    `[1:v]format=rgba,split=3[n1][n2][n3];[n1]gblur=sigma=${Math.round(h / 28)},${tint}[g1];[n2]gblur=sigma=${Math.round(h / 90)},${tint}[g2];` +
    `[bg][g1]overlay=x=(W-w)/2:y=${ny}[a1];[a1][g2]overlay=x=(W-w)/2:y=${ny}[a2];[a2][n3]overlay=x=(W-w)/2:y=${ny}[a3]`;
  let last = 'a3';
  if (tagL) { fc += `;[${last}][2:v]overlay=x=(W-w)/2:y=${ty}[a4]`; last = 'a4'; }
  const boxes = [
    [mg, mg, bw, th], [mg, mg, th, bw], [w - mg - bw, mg, bw, th], [w - mg - th, mg, th, bw],
    [mg, h - mg - th, bw, th], [mg, h - mg - bw, th, bw], [w - mg - bw, h - mg - th, bw, th], [w - mg - th, h - mg - bw, th, bw]
  ].map(([x, y, bwid, bh]) => `drawbox=x=${x}:y=${y}:w=${bwid}:h=${bh}:color=${col}@0.95:t=fill`).join(',');
  fc += `;[${last}]${boxes},format=yuv420p[v]`;
  const out = path.join(dir, 'img.png');
  await ff(['-y', ...inputs, '-filter_complex', fc, '-map', '[v]', '-frames:v', '1', out], 60000);
  return fs.readFileSync(out);
}
function parseThemeWord(parts) {
  let theme = 'cyan';
  const keep = parts.filter(p => { const k = p.trim().toLowerCase(); if (THEMES[k]) { theme = k; return false; } return true; });
  return { theme, rest: keep };
}

// stacked glowing text lines (+ optional round picture) on a themed background
async function cardImage(dir, { w, h, rgb, items, pic }) {
  const base = rgb || THEMES.cyan.c;
  const A = base.map(v => Math.round(v * 0.06 + 6)), B = base.map(v => Math.round(v * 0.28 + 8));
  const col = hx(base);
  const layers = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const L = await textLayer(it.text, Math.round(w * (it.width || 0.86)), it.sizes || [128, 64, 32], it.maxH || Math.round(h * 0.5));
    const f = path.join(dir, `it${i}.png`); fs.writeFileSync(f, L.png);
    layers.push({ f, h: L.h, glow: it.glow !== false, gap: it.gap == null ? 24 : it.gap });
  }
  const picSize = pic ? Math.round(Math.min(w, h) * 0.32) : 0;
  const total = (pic ? picSize + 40 : 0) + layers.reduce((s, l) => s + l.h + l.gap, 0) - (layers.length ? layers[layers.length - 1].gap : 0);
  let y = Math.max(40, Math.round((h - total) / 2));
  const inputs = ['-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:d=1`];
  let fc = `[0:v]${bgChain(w, h, A, B, true, col)}[bg0]`, last = 'bg0', idx = 1;
  const [cr, cg, cb] = base.map(v => (v / 255).toFixed(3));
  const tint = `colorchannelmixer=rr=${cr}:rg=0:rb=0:gr=0:gg=${cg}:gb=0:br=0:bg=0:bb=${cb}`;
  if (pic) {
    const pf = path.join(dir, 'pic.png'); fs.writeFileSync(pf, pic);
    inputs.push('-i', pf);
    const r = picSize / 2;
    fc += `;[${idx}:v]scale=${picSize}:${picSize}:force_original_aspect_ratio=increase,crop=${picSize}:${picSize},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-${r},Y-${r}),${r}),255,0)'[pc];` +
      `[pc]split=2[p1][p2];[p1]scale=${picSize + 24}:${picSize + 24},format=rgba,geq=r=${base[0]}:g=${base[1]}:b=${base[2]}:a='if(lte(hypot(X-${r + 12},Y-${r + 12}),${r + 12}),255,0)',gblur=sigma=6[ring];` +
      `[${last}][ring]overlay=x=(W-w)/2:y=${y - 12}[r1];[r1][p2]overlay=x=(W-w)/2:y=${y}[r2]`;
    last = 'r2'; idx++; y += picSize + 40;
  }
  for (const l of layers) {
    inputs.push('-i', l.f);
    if (l.glow) {
      fc += `;[${idx}:v]format=rgba,split=2[n${idx}a][n${idx}b];[n${idx}a]gblur=sigma=${Math.max(4, Math.round(h / 60))},${tint}[g${idx}];` +
        `[${last}][g${idx}]overlay=x=(W-w)/2:y=${y}[m${idx}];[m${idx}][n${idx}b]overlay=x=(W-w)/2:y=${y}[o${idx}]`;
    } else {
      fc += `;[${last}][${idx}:v]overlay=x=(W-w)/2:y=${y}[o${idx}]`;
    }
    last = `o${idx}`; idx++; y += l.h + l.gap;
  }
  const bw = Math.round(Math.min(w, h) * 0.06), th = Math.max(3, Math.round(h * 0.006)), mg = Math.round(Math.min(w, h) * 0.05);
  const boxes = [[mg, mg, bw, th], [mg, mg, th, bw], [w - mg - bw, mg, bw, th], [w - mg - th, mg, th, bw], [mg, h - mg - th, bw, th], [mg, h - mg - bw, th, bw], [w - mg - bw, h - mg - th, bw, th], [w - mg - th, h - mg - bw, th, bw]]
    .map(([x, yy, a, b]) => `drawbox=x=${x}:y=${yy}:w=${a}:h=${b}:color=${col}@0.95:t=fill`).join(',');
  fc += `;[${last}]${boxes},format=rgb24[v]`;
  const out = path.join(dir, 'card.png');
  await ff(['-y', ...inputs, '-filter_complex', fc, '-map', '[v]', '-frames:v', '1', out], 90000);
  return fs.readFileSync(out);
}

module.exports = {
  BRAND, TAG, UA,
  ffmpegBin, ff, probe, hasEncoder,
  makeDir, rmDir, sleep, rand, num, pickOne, kb, even, extFor, parseTime, stamp, seedFrom, dayKey,
  ctx, songAudio, getRetry, why, profilePic, makeVoiceNote, audioJob,
  textLayer, textStrip, THEMES, COLOR_WORDS, parseHex, hx, bgChain, futuristicImage, parseThemeWord, cardImage
};
