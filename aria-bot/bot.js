require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { SYSTEM_PROMPT } = require('./prompt');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const ESCALATION_REPLY = '@machefunded can you assist here?';

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

  return /^(what|which|who|how|when|where|why|can|could|do|does|did|is|are|will|would|should|tell|explain|list|compare)\b/i.test(text);
}

function wasBotMentioned(message) {
  return message.mentions.users.has(client.user.id);
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

async function askAI(question) {
  try {
    const res = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      prompt: SYSTEM_PROMPT + question,
      stream: false,
    });

    const answer = String(res.data?.response || '').trim();

    console.log('[ARIA][AI_RESPONSE]', answer);

    if (
      !answer ||
      answer.toLowerCase().includes('not explicitly stated') ||
      answer.toLowerCase().includes('not sure') ||
      answer.toLowerCase().includes('contact support')
    ) {
      return `I’m not fully sure about this one 🤔\n\n${ESCALATION_REPLY}`;
    }

    return answer;
  } catch (err) {
    console.error('[ARIA][AI_ERROR]', err.response?.data || err.message || err);
    return `Something went wrong.\n\n${ESCALATION_REPLY}`;
  }
}

client.on('ready', () => {
  console.log(`Aria is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!client.user) return;

  const mentioned = wasBotMentioned(message);
  const directQuestion = isDirectQuestion(message.content);
  const buyingIntent = hasBuyingIntent(message.content);

  if (!mentioned && !directQuestion && !buyingIntent) return;

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
  throw new Error('Missing DISCORD_BOT_TOKEN environment variable');
}

client.login(DISCORD_TOKEN);