require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { SYSTEM_PROMPT } = require('./prompt');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ESCALATION_REPLY = '@machefunded can you assist here?';
const ALLOWED_CHANNELS = [
  '1413064690287771749', // general chat
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function isDirectQuestion(content) {
  const text = content.trim();
  if (!text) return false;

  if (text.includes('?')) return true;

  return /^(what|which|who|how|when|where|why|can|could|do|does|did|is|are|will|would|should|tell|explain|list|compare)/i.test(text);
}

function wasBotMentioned(message) {
  return Boolean(client.user) && message.mentions.users.has(client.user.id);
}

function cleanQuestion(message) {
  return message.content.replace(/<@!?\d+>/g, '').trim();
}

function hasBuyingIntent(content) {
  const text = content.toLowerCase();

  return (
    text.includes('which account') ||
    text.includes('what should i choose') ||
    text.includes('best account') ||
    text.includes('how to start') ||
    text.includes('how to buy')
  );
}

function hasComplaintIntent(content) {
  const text = content.toLowerCase();

  return (
    text.includes('not fair') ||
    text.includes('this platform is bad') ||
    text.includes('this is bad') ||
    text.includes('annoying') ||
    text.includes('frustrating') ||
    text.includes('frustrated') ||
    text.includes('angry') ||
    text.includes('scam') ||
    text.includes('rubbish') ||
    text.includes('useless') ||
    text.includes('terrible') ||
    text.includes('worst') ||
    text.includes('problem with this platform')
  );
}

function hasPromoIntent(content) {
  const text = content.toLowerCase();

  return (
    text.includes('discount') ||
    text.includes('promo code') ||
    text.includes('promo') ||
    text.includes('free account') ||
    text.includes('free challenge') ||
    text.includes('giveaway')
  );
}

function hasBeginnerIntent(content) {
  const text = content.toLowerCase();

  return (
    text.includes("i'm new") ||
    text.includes('i am new') ||
    text.includes('beginner') ||
    text.includes('just starting') ||
    text.includes('new to trading')
  );
}

// ✅ NEW AI FUNCTION (Groq)
async function askAI(question) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question }
        ],
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = res.data.choices[0].message.content.trim();

    console.log("[ARIA][AI_RESPONSE]", answer);

    if (
      !answer ||
      answer.toLowerCase().includes("not explicitly stated") ||
      answer.toLowerCase().includes("not sure") ||
      answer.toLowerCase().includes("contact support")
    ) {
      return `I’m not fully sure about this one 🤔\n\n${ESCALATION_REPLY}`;
    }

    return answer;

  } catch (err) {
    console.error("[ARIA][AI_ERROR]", err.response?.data || err.message || err);
    return `Something went wrong.\n\n${ESCALATION_REPLY}`;
  }
}

client.on('ready', () => {
  console.log(`Aria is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!client.user) return;

  console.log('CHANNEL ID:', message.channel.id);

  if (message.channel.name && message.channel.name.startsWith('ticket')) return;

  const channelId = message.channel.parentId || message.channel.id;
  if (!ALLOWED_CHANNELS.includes(channelId)) return;

  if (message.reference?.messageId) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

      if (repliedMessage.author.id !== client.user.id) {
        return;
      }
    } catch (error) {
      console.error('[ARIA][REPLY_FETCH_ERROR]', error?.message || error);
      return;
    }
  }

  const text = message.content;
  const question = cleanQuestion(message);
  if (!question) return;

  console.log('[ARIA][QUESTION]', {
    user: message.author.tag,
    channel: message.channel?.id,
    question,
  });

  await message.channel.sendTyping();

  const answer = await askAI(question);

  console.log('[ARIA][FINAL_REPLY]', answer);

  await message.reply(answer);
});

if (!DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_BOT_TOKEN');
}

client.login(DISCORD_TOKEN);