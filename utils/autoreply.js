const TRIGGERS = {
  hi: 'Hey there! 👋',
  hello: 'Hello! How can I help? 😊',
  hey: 'Hey! 👋',
  'good morning': '☀️ Good morning!',
  'good night': '🌙 Good night, sleep well!',
  thanks: "You're welcome! 🙌",
  'thank you': "You're welcome! 🙌",
};

function getAutoReply(text) {
  const normalized = text.trim().toLowerCase();
  return TRIGGERS[normalized] || null;
}

module.exports = { getAutoReply };
