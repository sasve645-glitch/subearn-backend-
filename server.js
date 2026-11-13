const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Токен береться зі змінних середовища Render, але можна перевірити роботу
const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN || '';
const CRYPTO_API_URL = 'https://pay.crypt.bot/api';

// Тимчасове сховище в пам'яті для користувачів та інвойсів
const db = {
    users: {},
    invoices: {}
};

// 1. ВІДДАЧА ГОЛОВНОЇ СТОРІНКИ (Фронтенд SubEarn)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. СТВОРЕННЯ ІНВОЙСУ ЧЕРЕЗ CRYPTOBOT PAY
app.post('/api/create-invoice', async (req, res) => {
    try {
        const { telegramId, amountUAH, asset } = req.body;

        // Запит до Crypto Pay API
        const response = await fetch(`${CRYPTO_API_URL}/createInvoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN
            },
            body: JSON.stringify({
                asset: asset || 'USDT',
                amount: amountUAH, // або конвертована сума в крипту
                description: 'Поповнення балансу в SubEarn',
                payload: JSON.stringify({ telegramId })
            })
        });

        const data = await response.json();

        if (data.ok) {
            res.json({ success: true, invoiceUrl: data.result.pay_url });
        } else {
            res.status(400).json({ success: false, error: data.error });
        }
    } catch (err) {
        console.error('Error creating invoice:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SubEarn server is running on port ${PORT}`);
});
