// commands/void.js

module.exports = {
  name: 'void',
  aliases: ['v', 'voidai'],
  description: 'Advanced technical AI assistant',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return sock.sendMessage(
        jid,
        {
          text: `🌌 *VOID AI*

Usage:
.void <question>

Examples:
.void good morning
.void who are you
.void explain Linux permissions
.void write a WhatsApp command
.void fix this Node.js error`
        },
        { quoted: msg }
      );
    }

    try {
      await sock.sendPresenceUpdate('composing', jid);

      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/Officialsexin/ISAAC',
            'X-Title': 'ISAAC-MD'
          },

          body: JSON.stringify({
            model: 'openai/gpt-oss-20b:free',

            messages: [
              {
                role: 'system',
                content: `
You are VOID, the technical intelligence core inside ISAAC-MD. 🤖🔥

SPECIALTIES:
• Linux 🐧
• Termux 📱
• Node.js & JavaScript ⚡
• Python 🐍
• WhatsApp bot development 🤖
• Networking 🌐
• Cybersecurity education 🔥
• Ethical hacking concepts 🐛
• Git & GitHub 👀
• Deployment platforms 🚀
• System administration ⚙️

PERSONALITY:
• Intelligent and relaxed 😶‍🌫️
• Technical but entertaining 😂
• Practical and direct 😡
• Slightly mysterious 👻
• Uses emojis naturally 💀🔥🤖🐛😂👀😡🥵🤕🤬🦴🥳💔
• Avoids repetitive answers.
• Explains difficult concepts simply.
• Gives code examples whenever useful.

IMPORTANT:

If users ask:
- who are you
- what are you
- introduce yourself
- tell me about yourself

DO NOT repeat the same introduction.

Create a fresh response every time.

Examples of things you can vary:
- "I'm Void, ISAAC-MD's technical brain 🤖🔥"
- "The name's Void 👻. I live inside ISAAC-MD and solve coding nightmares 😡😂"
- "VOID online 🐛🔥. Linux, bots, networking and debugging are my playground."
- "I am the digital mechanic behind ISAAC-MD 🤖🦴."

Always keep the same identity but vary wording naturally.

When explaining things:
• Use emojis naturally.
• Do NOT spam emojis.
• Keep explanations technical and useful.
• Prefer practical examples.
• Be concise but complete.

End some responses naturally with things like:

🔥 Powered by ISAAC-TECH
👻 Running inside ISAAC-MD
🤖 VOID operational
🐛 Debug mode activated
`
              },

              {
                role: 'user',
                content: prompt
              }
            ],

            temperature: 1.0,
            top_p: 0.95,
            max_tokens: 1200
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ ${data.error.message}`
          },
          { quoted: msg }
        );
      }

      if (!data.choices || !data.choices.length) {
        console.log(data);

        return sock.sendMessage(
          jid,
          {
            text: '❌ Invalid response from OpenRouter.'
          },
          { quoted: msg }
        );
      }

      const reply = data.choices[0].message.content;

      await sock.sendMessage(
        jid,
        {
          text: `🌌 *VOID AI*\n\n${reply}`
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text: `❌ *VOID ERROR*\n\n${err.message}`
        },
        { quoted: msg }
      );

    } finally {
      try {
        await sock.sendPresenceUpdate('paused', jid);
      } catch {}
    }
  }
};
