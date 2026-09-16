# Xavfsizlik Qo'llanmasi va Maxfiy Kalitlarni Yangilash (Secret Rotation Guide)

> [!CAUTION]
> **MUHIM XAVFSIZLIK OGOHLANTIRISHI (SECRET ROTATION):**
> Loyihaning avvalgi versiyalarida Telegram bot tokenlari, Supabase API kalitlari va admin login/parollari Git commitlarida qolgan bo'lishi mumkin. **Faqatgina kodni tozalash yetarli emas!**
> Loyiha egasi quyidagi barcha token va parollarni darhol Telegram BotFather va Supabase Dashboard orqali **QO'LDA REVOKE QILIB (BEKOR QILIB), YANGI KALITLARGA ROTATSIYA QILISHI SHART!**

---

## 1. Telegram Bot Tokenlarini Yangilash (Revoke & Rotate)

Eski token orqali begona shaxslar bot nomidan xabar yuborishi yoki botni boshqarishi mumkin. Yangilash tartibi:

1. Telegram ilovasida **[@BotFather](https://t.me/BotFather)** botiga kiring.
2. `/mybots` buyrug'ini yuboring va loyihangiz botlarini (Admin bot va User bot) navbatma-navbat tanlang.
3. **API Token** bo'limiga kiring.
4. **Revoke current token** tugmasini bosing. Bu eski tokenni butunlay o'chiradi.
5. BotFather bergan yangi tokenni nusxalang va FAQAT serverdagi `.env.local` fayliga kiriting:
   ```env
   VITE_TELEGRAM_ADMIN_BOT_TOKEN=yangi_admin_bot_tokeni
   VITE_TELEGRAM_USER_BOT_TOKEN=yangi_user_bot_tokeni
   ```
6. Hech qachon ushbu tokenlarni Git repozitoriyasiga push qilmang.

---

## 2. Supabase Anon Key va Baza Parolini Yangilash

Eski Supabase Anon Key ochiq bo'lgan bo'lishi mumkin. Yangilash tartibi:

1. **Supabase Dashboard** ga kiring: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Loyihangizni tanlang.
3. **Project Settings -> API** bo'limiga o'ting.
4. **JWT Secret** bo'limida **Change JWT Secret** tugmasini bosing (bu barcha mavjud kalitlarni bekor qilib, yangi `anon` va `service_role` generatsiya qiladi).
5. Yangi `anon public` kalitni `.env.local` da yangilang:
   ```env
   VITE_SUPABASE_ANON_KEY=yangi_anon_kalit
   ```
6. **Database parolini yangilash:**
   - **Project Settings -> Database** ga o'ting.
   - **Reset database password** orqali yangi kuchli parol o'rnating.

---

## 3. Admin Login va Parolini Boshqarish (100% Server-Side)

Admin autentifikatsiyasi frontend JS bundle ichida yoki `VITE_` muhit o'zgaruvchilarida EMAS, balki **to'liq Supabase serverida (PostgreSQL RPC / Edge Function)** amalga oshiriladi:
- Vite `VITE_` prefiksli har qanday o'zgaruvchini build paytida client bundle ichiga ochiq matn qilib qo'shadi. Shuning uchun parollar frontend muhit o'zgaruvchilaridan to'liq olib tashlangan.
- Baza darajasida (`admin_credentials` jadvali) admin paroli PostgreSQL `pgcrypto` kengaytmasi yordamida **bcrypt** bilan xeshlangan holda saqlanadi va unga to'g'ridan-to'g'ri tashqaridan kirish bloklangan.
- Tekshiruv faqat `admin_verify_credentials` server funksiyasi (SECURITY DEFINER) yoki Supabase Edge Function orqali bajariladi.
- Admin parolini o'zgartirish uchun Supabase SQL Editorda quyidagi buyruqni bajarasiz:
  ```sql
  UPDATE admin_credentials 
  SET password_hash = crypt('SIZNING_YANGI_KUCHLI_PAROLINGIZ', gen_salt('bf', 10)),
      updated_at = now()
  WHERE login = 'ADMIN_LOGININGIZ';
  ```
- **Ikkita Telegram Bot Arxitekturasi:**
  1. **Admin Boti:** Barcha ruxsat so'rashlar (Admin panelga kirish 2FA, yangi e'lon moderatsiyasi, tahrirlash ruxsati, VIP maqomi) FAQAT sizning `.env.local` da ko'rsatilgan shaxsiy Telegram Chat ID (`VITE_ADMIN_CHAT_ID`) ga boradi va inline tugmalarni faqat siz bosa olasiz.
  2. **User Boti:** Saytda ro'yxatdan o'tayotgan yoki parolini tiklayotgan foydalanuvchilar uchun tasdiqlash kodini yetkazib beradi va bot orqali ro'yxatdan o'tkazadi. Hech qanday admin ruxsatlari bu botga aralashmaydi.

---

## 4. Muhit O'zgaruvchilari Xavfsizligi (.env va .gitignore)

- `.env.local` va `.env` fayllari hech qachon Git repozitoriyasiga yuklanmasligi kerak.
- Repozitoriyda faqat `.env.example` namunasi saqlanadi (faqat placeholderlar bilan).

---

## 5. Supabase Bazasida RLS Policy'lari

`supabase_schema.sql` fayli orqali:
- `users` jadvalidagi `parol_hash` ustuni tashqariga (anon key orqali) chiqmaydi.
- Har bir foydalanuvchi faqat o'z e'lonlarini tahrirlashi yoki o'chirishi mumkin.
- Tasdiqlanmagan yoki noqonuniy admin kirish so'rovlari bloklanadi.

---

## 6. Foydalanuvchi Parollari (Bcrypt)

Tizim xavfsiz **bcryptjs** (salt round: 10) xesh algoritmidan foydalanadi:
- Barcha yangi foydalanuvchilar va parolini yangilaganlar avtomatik ravishda bcrypt bilan xeshlanadi.
- Admin panel orqali tahrirlanganda ham doim bcrypt hash generatsiya qilinadi.
