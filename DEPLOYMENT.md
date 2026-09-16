# Uy Bozor Telegram Bot Daemon — Serverga Joylashtirish Qo'llanmasi (Deployment Guide)

Ushbu hujjat "Uy Bozor" loyihasining Telegram Bot Daemon xizmatini (`scripts/bot-daemon.js`) mustaqil serverda (VPS, Railway, Render, Docker yoki systemd) xavfsiz va uzluksiz ishlatish bo'yicha qo'llanmadir.

---

## 1. Umumiy Ma'lumot

`scripts/bot-daemon.js` quyidagi asosiy vazifalarni bajaradi:
1. **Admin Bot Moderatsiyasi:** E'lonlarni tasdiqlash (`approve_`), rad etish (`reject_`), VIP qilish (`approve_vip_`), tahrirlashga ruxsat berish (`allow_edit_`), admin panelga 2FA kirishni tasdiqlash (`approve_login_`). Tugmalarni faqat `.env.local` da ko'rsatilgan `VITE_ADMIN_CHAT_ID` egasi bosa oladi.
2. **User Bot Xizmatlari:** Telegram ichida to'liq 3 bosqichli ro'yxatdan o'tish (ism -> telefon -> parol), parollarni `bcrypt` bilan xeshlash, Supabase bazasiga saqlash va OTP kodlarini yetkazib berish.

Xavfsizlik talablariga ko'ra, barcha Telegram bot polling va moderatsiya jarayoni faqat **server tomonida** (`bot-daemon.js`) amalga oshiriladi.

---

## 2. Muhit O'zgaruvchilari (Environment Variables)

Server muhitiga yoki `.env.local` fayliga quyidagi o'zgaruvchilar kiritilishi shart:

```env
# 1. Admin Bot
VITE_TELEGRAM_ADMIN_BOT_TOKEN=8518990743:...
VITE_ADMIN_CHAT_ID=8500341142
VITE_TELEGRAM_ADMIN_BOT_USERNAME=Uybozorinbot

# 2. Foydalanuvchi Boti (Kod va Ro'yxatdan o'tish)
VITE_TELEGRAM_USER_BOT_TOKEN=8612336657:...
VITE_TELEGRAM_USER_BOT_USERNAME=uybozorcodebot

# 3. Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Sayt domeni
SITE_URL=https://uy-bozor.uz
```

---

## 3. Joylashtirish Usullari

### Usul A: Ubuntu / Debian VPS da systemd Service sifatida (Tavsiya etiladi)

1. Serveringizda Node.js 18+ o'rnatilganligini tekshiring:
   ```bash
   node -v
   ```

2. Loyiha papkasiga o'ting va bog'liqliklarni o'rnating:
   ```bash
   cd /var/www/uybozor
   npm install
   ```

3. Yangi systemd service faylini yarating:
   ```bash
   sudo nano /etc/systemd/system/uybozor-bot.service
   ```

4. Quyidagi konfiguratsiyani kiriting:
   ```ini
   [Unit]
   Description=Uy Bozor Telegram Bot Daemon
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/var/www/uybozor
   ExecStart=/usr/bin/node scripts/bot-daemon.js
   Restart=always
   RestartSec=10
   EnvironmentFile=/var/www/uybozor/.env.local

   [Install]
   WantedBy=multi-user.target
   ```

5. Xizmatni faollashtiring va ishga tushiring:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable uybozor-bot
   sudo systemctl start uybozor-bot
   ```

6. Holatni va loglarni tekshirish:
   ```bash
   sudo systemctl status uybozor-bot
   sudo journalctl -u uybozor-bot -f
   ```

---

### Usul B: PM2 (Process Manager) orqali

Agar serverda PM2 o'rnatilgan bo'lsa:

```bash
# Ishga tushirish
pm2 start scripts/bot-daemon.js --name "uybozor-bot"

# Avtomatik qayta yuklanishni saqlash
pm2 save
pm2 startup

# Loglarni kuzatish
pm2 logs uybozor-bot
```

---

### Usul C: Railway / Render / VPS Docker orqali

1. `package.json` faylida `"bot:daemon": "node scripts/bot-daemon.js"` buyrug'i mavjud.
2. Railway yoki Render platformasida yangi **Background Worker** (yoki Web Service) yarating.
3. Start Command sifatida quyidagilarni ko'rsating:
   ```bash
   node scripts/bot-daemon.js
   ```
4. Platforma sozlamalarida kerakli barcha `VITE_TELEGRAM_ADMIN_BOT_TOKEN`, `VITE_TELEGRAM_USER_BOT_TOKEN`, `VITE_ADMIN_CHAT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` parametrlarini qo'shing.

---

### Usul D: Telegram Webhook Rejimi (Supabase Edge Functions)

Agar doimiy ishlaydigan Node.js daemon o'rniga to'liq serverless rejim kerak bo'lsa:
1. `supabase/functions/bot-register-webhook/index.ts` funksiyasini Supabase CLI orqali deploy qiling:
   ```bash
   supabase functions deploy bot-register-webhook
   ```
2. Telegram BotFather orqali webhook URL ni bog'lang:
   ```bash
   curl -F "url=https://<your-project>.supabase.co/functions/v1/bot-register-webhook" https://api.telegram.org/bot<TOKEN>/setWebhook
   ```
