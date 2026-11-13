const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
const path = require('path');

// Обробник головної сторінки
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Токен береться зі змінних середовища Render.com
const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN;
const CRYPTO_API_URL = 'https://pay.crypt.bot/api/'; 

// Тимчасове сховище в пам'яті (або підключіть базу даних)
const db = {
  users: {},
  invoices: {}
};

// Створення реального інвойсу через CryptoBot
app.post('/api/create-invoice', async (req, res) => {
  try {
    const { telegramId, amountUAH, asset } = req.body;
    const amountCrypto = (amountUAH / 41.5).toFixed(2);

    const response = await fetch(`${CRYPTO_API_URL}createInvoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN
      },
      body: JSON.stringify({
        asset: asset || 'USDT',
        amount: amountCrypto,
        description: `Поповнення балансу SubEarn на ${amountUAH} ₴`,
        payload: JSON.stringify({ telegramId, amountUAH }),
        expires_in: 900
      })
    });

    const data = await response.json();
    if (!data.ok) {
      return res.status(400).json({ success: false, error: data.error });
    }

    db.invoices[data.result.invoice_id] = { telegramId, amountUAH, status: 'active' };

    res.json({
      success: true,
      pay_url: data.result.pay_url,
      bot_invoice_url: data.result.bot_invoice_url
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook від CryptoBot
app.post('/api/cryptobot/webhook', (req, res) => {
  const update = req.body;
  if (update && update.update_type === 'invoice_paid') {
    const invoice = update.payload.invoice;
    let payload = {};
    try { payload = JSON.parse(invoice.payload); } catch (e) {}

    const { telegramId, amountUAH } = payload;
    if (telegramId && db.invoices[invoice.invoice_id] && db.invoices[invoice.invoice_id].status === 'active') {
      db.invoices[invoice.invoice_id].status = 'paid';
      if (!db.users[telegramId]) db.users[telegramId] = { balance: 0 };
      db.users[telegramId].balance += Number(amountUAH);
    }
  }
  res.status(200).send('OK');
});

app.get('/api/user/:telegramId', (req, res) => {
  const user = db.users[req.params.telegramId] || { balance: 0 };
  res.json({ success: true, balance: user.balance });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
