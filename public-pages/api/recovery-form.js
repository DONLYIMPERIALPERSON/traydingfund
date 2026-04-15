const TELEGRAM_API_BASE = 'https://api.telegram.org';

const normalizeAccountNumber = (value) => String(value || '').replace(/[^0-9]/g, '');

const sendTelegramMessage = async (message) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('Telegram configuration is missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID on Vercel.');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram request failed: ${text || response.statusText}`);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, accountNumber, phase } = req.body || {};

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedAccountNumber = normalizeAccountNumber(accountNumber);
    const normalizedPhase = String(phase || '').trim();

    if (!normalizedEmail || !normalizedAccountNumber || !normalizedPhase) {
      return res.status(400).json({ message: 'Email, account number, and phase are required.' });
    }

    const allowedPhases = new Set(['Phase 1', 'Phase 2', 'Funded']);
    if (!allowedPhases.has(normalizedPhase)) {
      return res.status(400).json({ message: 'Invalid phase selected.' });
    }

    const message = [
      '🚨 Recovery Form Submission',
      '',
      `Email: ${normalizedEmail}`,
      `Account Number: ${normalizedAccountNumber}`,
      `Phase: ${normalizedPhase}`,
      '',
      'Warning acknowledged: Wrong details or manipulated data can lead to a permanent ban.',
    ].join('\n');

    await sendTelegramMessage(message);

    return res.status(200).json({ message: 'Recovery request sent successfully.' });
  } catch (error) {
    console.error('Recovery form submission error:', error);
    return res.status(500).json({ message: 'Failed to submit recovery request. Please try again later.' });
  }
}