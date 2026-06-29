/**
 * ISAAC BOT — Web Pairing Server
 * Run:  node pair.js
 * Open: http://localhost:3000
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");
const pino = require("pino");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const qrcode = require("qrcode");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let sock = null;
let latestQR = null;

// ── Start WhatsApp connection ───────────────────────────────────────────────
async function connect(phoneNumber = null) {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["ISAAC Bot", "Chrome", "1.0.0"],
  });

  // Pairing code request
  if (phoneNumber && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const raw = await sock.requestPairingCode(phoneNumber);
        const code = raw.match(/.{1,4}/g).join("-");
        io.emit("pairing_code", { code });
        console.log(`Pairing code: ${code}`);
      } catch (e) {
        io.emit("status", { msg: "Failed to get code: " + e.message, color: "red" });
      }
    }, 3000);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      const img = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
      io.emit("qr", { img });
    }

    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0];
      console.log(`Connected as +${phone}`);
      io.emit("connected", { phone });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        io.emit("status", { msg: "Logged out. Restart and re-link.", color: "red" });
      } else {
        io.emit("status", { msg: "Reconnecting...", color: "yellow" });
        setTimeout(() => connect(), 4000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// ── Routes ──────────────────────────────────────────────────────────────────
app.post("/start-qr", async (req, res) => {
  await connect();
  res.json({ ok: true });
});

app.post("/start-pair", async (req, res) => {
  const phone = req.body.phone?.replace(/\D/g, "");
  if (!phone) return res.status(400).json({ ok: false });
  await connect(phone);
  res.json({ ok: true });
});

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on("connection", async (socket) => {
  if (latestQR) {
    const img = await qrcode.toDataURL(latestQR, { width: 280, margin: 2 });
    socket.emit("qr", { img });
  }
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\nPairing page -> http://localhost:${PORT}\n`);
});
