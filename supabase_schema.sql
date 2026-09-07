-- ==========================================================
-- UY BOZOR: KO'CHMAS MULK PLATFORMASI UCHUN SUPABASE BAZA SXEMASI
-- ==========================================================

-- 1. USERS (Foydalanuvchilar) jadvali
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    ism VARCHAR(255) NOT NULL,
    telefon VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    parol_hash TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    yaratilgan_sana TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LISTINGS (E'lonlar) jadvali
CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    turi VARCHAR(20) NOT NULL,
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
    holat VARCHAR(20) DEFAULT 'kutilmoqda',
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
    listing_id TEXT,
    user_id TEXT,
    summa NUMERIC(14, 2) NOT NULL,
    holat VARCHAR(20) DEFAULT 'kutilmoqda',
    tolov_provayderi VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    sana TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. LOGIN_REQUESTS (Admin 2FA kirish so'rovlari) jadvali
CREATE TABLE IF NOT EXISTS login_requests (
    id TEXT PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'kutilmoqda',
    user_id TEXT,
    user_name TEXT,
    user_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 🔒 BARCHA JADVALLARGA RUXSATLARNI OCHISH (RLS)
-- ==========================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_requests ENABLE ROW LEVEL SECURITY;

-- users ruxsati
DROP POLICY IF EXISTS "Public users access" ON users;
CREATE POLICY "Public users access" ON users FOR ALL USING (true) WITH CHECK (true);

-- listings ruxsati (hamma o'qiy oladi, qo'sha oladi, tahrirlay oladi)
DROP POLICY IF EXISTS "Public listings access" ON listings;
CREATE POLICY "Public listings access" ON listings FOR ALL USING (true) WITH CHECK (true);

-- payments ruxsati
DROP POLICY IF EXISTS "Public payments access" ON payments;
CREATE POLICY "Public payments access" ON payments FOR ALL USING (true) WITH CHECK (true);

-- login_requests ruxsati
DROP POLICY IF EXISTS "Public login_requests access" ON login_requests;
CREATE POLICY "Public login_requests access" ON login_requests FOR ALL USING (true) WITH CHECK (true);

