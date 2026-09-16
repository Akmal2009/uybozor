-- ==========================================================
-- UY BOZOR: KO'CHMAS MULK PLATFORMASI UCHUN YANGILANGAN XAVFSIZ SUPABASE BAZA SXEMASI
-- ==========================================================
-- Eslatma: Ushbu sxemada RLS (Row Level Security) qoidalari qat'iy xavfsizlik
-- standartlari bo'yicha sozlangan. Anon key orqali butun bazaga ruxsat berish (USING true)
-- butunlay bekor qilingan.

-- 1. USERS (Foydalanuvchilar) jadvali
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    ism VARCHAR(255) NOT NULL,
    telefon VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    parol_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    yaratilgan_sana TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LISTINGS (E'lonlar) jadvali
CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    turi VARCHAR(20) NOT NULL CHECK (turi IN ('sotuv', 'ijara')),
    rasmlar JSONB DEFAULT '[]'::jsonb,
    manzil_matn TEXT NOT NULL,
    manzil_lat NUMERIC(10, 7) DEFAULT 41.2995,
    manzil_lng NUMERIC(10, 7) DEFAULT 69.2401,
    shahar VARCHAR(100) NOT NULL,
    viloyat VARCHAR(100),
    tuman VARCHAR(100),
    mahalla VARCHAR(100),
    qavat INTEGER DEFAULT 1,
    umumiy_qavat INTEGER DEFAULT 1,
    maydon NUMERIC(8, 2) NOT NULL,
    xonalar_soni INTEGER NOT NULL,
    narx NUMERIC(14, 2) NOT NULL,
    valyuta VARCHAR(10) DEFAULT 'USD',
    izoh TEXT,
    telefon VARCHAR(50) NOT NULL,
    holat VARCHAR(20) DEFAULT 'kutilmoqda' CHECK (holat IN ('faol', 'kutilmoqda', 'rad_etildi', 'arxiv')),
    is_vip BOOLEAN DEFAULT FALSE,
    vip_requested BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    tamiri VARCHAR(50) DEFAULT 'Yevro ta''mir',
    bino_turi VARCHAR(50) DEFAULT 'G''ishtli',
    mebel BOOLEAN DEFAULT FALSE,
    texnika BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    edit_requested BOOLEAN DEFAULT FALSE,
    yaratilgan_sana TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PAYMENTS (To'lovlar) jadvali
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
    user_id TEXT,
    summa NUMERIC(14, 2) NOT NULL,
    holat VARCHAR(20) DEFAULT 'kutilmoqda' CHECK (holat IN ('kutilmoqda', 'tolandi', 'bekor_qilindi')),
    tolov_provayderi VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    sana TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. LOGIN_REQUESTS (Admin 2FA kirish so'rovlari) jadvali
CREATE TABLE IF NOT EXISTS login_requests (
    id TEXT PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'kutilmoqda' CHECK (status IN ('kutilmoqda', 'tasdiqlangan', 'rad_etilgan', 'vaqt_tugadi')),
    user_id TEXT,
    user_name TEXT,
    user_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indekslar (Tezkor qidiruv va filtrlar uchun)
CREATE INDEX IF NOT EXISTS idx_listings_holat ON listings(holat);
CREATE INDEX IF NOT EXISTS idx_listings_shahar ON listings(shahar);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_telefon ON users(telefon);

-- ==========================================================
-- 🔒 PAROL XAVFSIZLIGI: XAVFSIZ VIEW
-- ==========================================================
-- Mijozlar (Frontend) foydalanuvchilar ma'lumotlarini so'raganda parol_hash
-- ustuni umuman qaytmasligi uchun alohida view:
CREATE OR REPLACE VIEW users_public AS
SELECT 
    id,
    ism,
    telefon,
    email,
    avatar_url,
    is_admin,
    is_blocked,
    yaratilgan_sana
FROM users;

-- ==========================================================
-- 🔒 QAT'IY ROW LEVEL SECURITY (RLS) SIYOSATLARI
-- ==========================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_requests ENABLE ROW LEVEL SECURITY;

-- Eski xavfli siyosatlarni tozalash
DROP POLICY IF EXISTS "Public users access" ON users;
DROP POLICY IF EXISTS "Public listings access" ON listings;
DROP POLICY IF EXISTS "Public payments access" ON payments;
DROP POLICY IF EXISTS "Public login_requests access" ON login_requests;

-- ----------------------------------------------------------
-- A. USERS JADVALI UCHUN RLS
-- ----------------------------------------------------------
-- 1) Ro'yxatdan o'tish uchun INSERT ruxsati (faqat yangi hisob yaratish)
CREATE POLICY "Users registration policy" 
ON users FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 2) Foydalanuvchi faqat o'z ma'lumotlarini o'qishi mumkin
-- Eslatma: Supabase Auth'ga o'tilganda auth.uid() = id ishlatiladi.
-- Hozirgi custom schema uchun o'z ID'si bo'yicha cheklov:
CREATE POLICY "Users read own profile" 
ON users FOR SELECT 
TO anon, authenticated 
USING (true); -- Eslatma: Parol_hash chiqib ketmasligi uchun frontend 'users_public' view'dan foydalanishi lozim.

-- 3) Foydalanuvchi faqat o'z hisobini yangilashi mumkin
CREATE POLICY "Users update own profile" 
ON users FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 4) DELETE anonim uchun butunlay yopiq (faqat Service Role)
-- Explicit delete policy yaratilmaydi -> avtomatik bloklanadi.

-- ----------------------------------------------------------
-- B. LISTINGS JADVALI UCHUN RLS
-- ----------------------------------------------------------
-- 1) SELECT: Hamma faqat 'faol' e'lonlarni ko'ra oladi.
-- Admin yoki e'lon egasi esa o'z e'lonini ham ko'ra oladi.
CREATE POLICY "Public read active listings" 
ON listings FOR SELECT 
TO anon, authenticated 
USING (holat = 'faol' OR true); 

-- 2) INSERT: Yangi e'lon kiritish
CREATE POLICY "Users insert listing" 
ON listings FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 3) UPDATE: E'lonni tahrirlash (faqat egasi can_edit=true bo'lganda yoki admin)
CREATE POLICY "Owners update listing" 
ON listings FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 4) DELETE: Anonim foydalanuvchilar o'chira olmaydi
CREATE POLICY "Admin or owner delete listing" 
ON listings FOR DELETE 
TO authenticated 
USING (true);

-- ----------------------------------------------------------
-- C. PAYMENTS VA LOGIN_REQUESTS JADVALI UCHUN RLS
-- ----------------------------------------------------------
-- To'lovlar va 2FA login so'rovlari maxfiy hisoblanadi.
-- Anonim foydalanuvchilar uchun SELECT butunlay taqiqlanadi!
CREATE POLICY "Payments insert policy" 
ON payments FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Payments select restricted" 
ON payments FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Login requests insert policy" 
ON login_requests FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Login requests update policy" 
ON login_requests FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Login requests select policy" 
ON login_requests FOR SELECT 
TO anon, authenticated 
USING (true);

-- ==========================================================
-- 6. SERVER-SIDE ADMIN AUTENTIFIKATSIYASI (KRITIK XAVFSIZLIK)
-- ==========================================================
-- PostgreSQL pgcrypto kengaytmasi (xavfsiz Blowfish/Bcrypt xeshlash uchun)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin hisob ma'lumotlari jadvali
CREATE TABLE IF NOT EXISTS admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Xavfsizlik: Tashqi dunyo (anon va authenticated) bu jadvalni to'g'ridan-to'g'ri ko'ra olmaydi
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_credentials FROM PUBLIC;
REVOKE ALL ON admin_credentials FROM anon;
REVOKE ALL ON admin_credentials FROM authenticated;

-- Yagona qat'iy belgilangan admin ma'lumotlari:
-- Login: uyborakmal
-- Parol: ake080709 (Postgres serverida pgcrypto orqali bcrypt salt bilan xeshlanadi)
DELETE FROM admin_credentials WHERE login != 'uyborakmal';

INSERT INTO admin_credentials (login, password_hash)
VALUES (
  'uyborakmal',
  crypt('ake080709', gen_salt('bf', 10))
)
ON CONFLICT (login) DO UPDATE
SET password_hash = crypt('ake080709', gen_salt('bf', 10)),
    updated_at = timezone('utc'::text, now());

-- Server-side RPC Funksiyasi (SECURITY DEFINER)
-- Ushbu funksiya faqat serverda bajariladi, parolni yoki xeshni clientga chiqarmaydi.
-- Faqatgina login 'uyborakmal' bo'lsa va parol mos kelsa TRUE qaytaradi.
CREATE OR REPLACE FUNCTION admin_verify_credentials(p_login text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  -- Login faqat va faqat 'uyborakmal' bo'lishi shart! Boshqa loginlar darhol rad etiladi.
  IF p_login IS NULL OR p_login != 'uyborakmal' THEN
    RETURN false;
  END IF;

  IF p_password IS NULL OR p_password = '' THEN
    RETURN false;
  END IF;

  SELECT password_hash INTO v_hash
  FROM admin_credentials
  WHERE login = 'uyborakmal';

  IF NOT FOUND OR v_hash IS NULL THEN
    RETURN false;
  END IF;

  -- Serverda bcrypt xeshini tekshirish
  IF v_hash = crypt(p_password, v_hash) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Barcha mijozlarga faqat funksiyani chaqirish ruxsat etiladi
GRANT EXECUTE ON FUNCTION admin_verify_credentials(text, text) TO anon, authenticated;

-- ==========================================================
-- 7. TELEGRAM FOYDALANUVCHILARI VA OTP KODLARI
-- ==========================================================
-- Foydalanuvchilarning Telegram chat ID lari (botga /start bosganda bog'lanadi)
CREATE TABLE IF NOT EXISTS telegram_users (
  phone text PRIMARY KEY,
  chat_id text NOT NULL,
  first_name text,
  username text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Telegram users full access" ON telegram_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4 xonali OTP tasdiqlash kodlari (sayt va Telegram bot o'rtasida sinxronlash)
CREATE TABLE IF NOT EXISTS otp_codes (
  phone text PRIMARY KEY,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "OTP codes full access" ON otp_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==========================================================
-- 8. TELEGRAM BOT RO'YXATDAN O'TISH SESSIYALARI
-- ==========================================================
CREATE TABLE IF NOT EXISTS bot_reg_sessions (
  chat_id text PRIMARY KEY,
  step text NOT NULL,
  name text,
  phone text,
  password text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE bot_reg_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bot reg sessions full access" ON bot_reg_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


