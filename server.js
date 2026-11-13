const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Токен CryptoBot береться зі змінних середовища Render
const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN || '';
const CRYPTO_API_URL = 'https://pay.crypt.bot/api';

// База даних у пам'яті (для збереження користувачів та їх балансів)
const db = {
    users: {}
};

// 1. ВІДДАЧА ФРОНТЕНДУ (Головна сторінка Mini App)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. АВТОРИЗАЦІЯ / РЕЄСТРАЦІЯ КОРИСТУВАЧА ЗА TELEGRAM ID
app.post('/api/auth', (req, res) => {
    const { telegramId, username, firstName } = req.body;
    
    if (!telegramId) {
        return res.status(400).json({ success: false, error: 'No telegramId provided' });
    }

    // Якщо користувача ще немає в базі — реєструємо
    if (!db.users[telegramId]) {
        db.users[telegramId] = {
            telegramId,
            username: username || 'No username',
            firstName: firstName || 'User',
            balance: 0.00,
            createdAt: new Date()
        };
        console.log(`[AUTH] Зареєстровано нового користувача: ${telegramId}`);
    } else {
        console.log(`[AUTH] Успішний вхід користувача: ${telegramId}`);
    }

    res.json({ success: true, user: db.users[telegramId] });
});

// 3. ОТРИМАННЯ ДАНИХ КОРИСТУВАЧА
app.get('/api/user/:telegramId', (req, res) => {
    const { telegramId } = req.params;
    const user = db.users[telegramId];
    
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, user });
});

// 4. СТВОРЕННЯ ІНВОЙСУ ЧЕРЕЗ CRYPTOBOT PAY API
app.post('/api/create-invoice', async (req, res) => {
    try {
        const { telegramId, amountUAH, asset } = req.body;

        if (!amountUAH || amountUAH <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        // Надсилаємо запит до Crypto Pay API для створення реального рахунку
        const response = await fetch(`${CRYPTO_API_URL}/createInvoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN
            },
            body: JSON.stringify({
                asset: asset || 'USDT',
                amount: String(amountUAH), // Сума в крипті / еквіваленті
                description: `Поповнення балансу SubEarn на ${amountUAH} ₴`,
                payload: JSON.stringify({ telegramId })
            })
        });

        const data = await response.json();

        if (data.ok) {
            res.json({ success: true, invoiceUrl: data.result.pay_url });
        } else {
            console.error('CryptoBot API Error:', data.error);
            res.status(400).json({ success: false, error: data.error?.message || 'CryptoBot error' });
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
