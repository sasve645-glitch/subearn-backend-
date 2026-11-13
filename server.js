const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN || '';
const CRYPTO_API_URL = 'https://pay.crypt.bot/api';

// База даних у пам'яті сервісу (для продакшну можна підключити MongoDB/PostgreSQL)
const db = {
    users: {} // Ключ — telegramId
};

// Віддаємо головну сторінку
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// АВТОРИЗАЦІЯ / РЕЄСТРАЦІЯ КОРИСТУВАЧА
app.post('/api/auth', (req, res) => {
    const { telegramId, username, firstName } = req.body;
    
    if (!telegramId) {
        return res.status(400).json({ success: false, error: 'No telegramId provided' });
    }

    // Якщо користувача ще немає — реєструємо
    if (!db.users[telegramId]) {
        db.users[telegramId] = {
            telegramId,
            username: username || 'No username',
            firstName: firstName || 'User',
            balance: 0.00,
            customerBudget: 0.00,
            createdAt: new Date()
        };
        console. зареєстровано нового користувача: ${telegramId};
    }

    res.json({ success: true, user: db.users[telegramId] });
});

// ОТРИМАННЯ БАЛАНСУ
app.get('/api/user/:telegramId', (req, res) => {
    const { telegramId } = req.params;
    const user = db.users[telegramId];
    
    if (!user) {
        return.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, user });
});

// СТВОРЕННЯ ІНВОЙСУ ЧЕРЕЗ CRYPTOBOT
app.post('/api/create-invoice', async (req, res) => {
    try {
        const { telegramId, amountUAH, asset } = req.body;

        const response = await fetch(`${CRYPTO_API_URL}/createInvoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN
            },
            body: JSON.stringify({
                asset: asset || 'USDT',
                amount: amountUAH,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SubEarn server is running on port ${PORT}`);
});
