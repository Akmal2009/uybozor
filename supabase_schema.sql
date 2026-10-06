-- ==============================================================================
-- UY BOZOR: YANGILANGAN VA TO'LIQ XAVFSIZ SUPABASE SXEMASI (RLS & Supabase Auth)
-- ==============================================================================
-- Barcha RLS siyosatlari auth.uid() asosida qurilgan.
-- "USING (true)" va "OR true" ko'rinishidagi barcha zaifliklar butunlay olib tashlangan.
-- Maxfiy jadvallar (otp_codes, telegram_users, login_requests) faqat Service Role uchun.
-- TO'LOV TIZIMI (payments) ga tegilmagan.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. FOYDALANUVCHILAR VA PROFILLAR (PROFILES)
-- ==============================================================================
-- auth.users jadvaliga bog'langan xavfsiz profiles jadvali
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ism VARCHAR(255) NOT NULL,
    telefon VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    yaratilgan_sana TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_profiles_telefon ON public.profiles(telefon);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- ==============================================================================
-- 3. ADMIN TEKSHIRUV FUNKSIYASI (is_admin)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true AND is_blocked = false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ==============================================================================
-- 4. PROFIL USTUNLARINI HIMOYA QILISH TRIGGERI
-- ==============================================================================
-- Oddiy foydalanuvchi o'zini admin (is_admin=true) yoki blokni (is_blocked=false) qila olmasligi uchun
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Agar o'zgartiruvchi admin bo'lmasa, is_admin va is_blocked o'zgarmaydi
    IF NOT public.is_admin() THEN
        NEW.is_admin := OLD.is_admin;
        NEW.is_blocked := OLD.is_blocked;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_privileges ON public.profiles;
CREATE TRIGGER tr_protect_profile_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_privileges();

-- ==============================================================================
-- 5. YANGI AUTH FOYDALANUVCHISINI AVTOMATIK PROFILGA ULASH TRIGGERI
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ism TEXT;
    v_telefon TEXT;
BEGIN
    v_ism := COALESCE(NEW.raw_user_meta_data->>'ism', NEW.raw_user_meta_data->>'name', 'Foydalanuvchi');
    v_telefon := COALESCE(NEW.raw_user_meta_data->>'telefon', NEW.phone, split_part(NEW.email, '@', 1));

    INSERT INTO public.profiles (id, ism, telefon, email, avatar_url, is_admin, is_blocked)
    VALUES (
        NEW.id,
        v_ism,
        v_telefon,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(v_ism::bytea, 'hex')),
        false,
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET ism = EXCLUDED.ism,
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 6. E'LONLAR (LISTINGS) JADVALI
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.listings (
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
    holat VARCHAR(20) DEFAULT 'kutilmoqda' CHECK (holat IN ('faol', 'kutilmoqda', 'rad_etildi', 'sotilgan', 'nobakor', 'arxiv')),
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

CREATE INDEX IF NOT EXISTS idx_listings_holat ON public.listings(holat);
CREATE INDEX IF NOT EXISTS idx_listings_shahar ON public.listings(shahar);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_created ON public.listings(yaratilgan_sana DESC);

-- ==============================================================================
-- 7. ATOMIK KO'RISHLAR SONI OSHIRISH FUNKSIYASI
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.listings
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_views(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 8. MAXFIY VA SERVIS JADVALLARI (FAQAT SERVICE ROLE UCHUN)
-- ==============================================================================

-- A. OTP Kodlari jadvali
CREATE TABLE IF NOT EXISTS public.otp_codes (
    phone TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Telegram Foydalanuvchilari jadvali
CREATE TABLE IF NOT EXISTS public.telegram_users (
    phone TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    first_name TEXT,
    username TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Telegram Bot Registratsiya Sessiyalari
CREATE TABLE IF NOT EXISTS public.bot_reg_sessions (
    chat_id TEXT PRIMARY KEY,
    step TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- D. Admin 2FA Kirish So'rovlari jadvali
CREATE TABLE IF NOT EXISTS public.login_requests (
    id TEXT PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'kutilmoqda' CHECK (status IN ('kutilmoqda', 'tasdiqlangan', 'rad_etilgan', 'vaqt_tugadi')),
    user_id TEXT,
    user_name TEXT,
    user_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- E. TO'LOVLAR (PAYMENTS) JADVALI - O'ZGARISHLARSIZ SAQLANDI
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
    user_id TEXT,
    summa NUMERIC(14, 2) NOT NULL,
    holat VARCHAR(20) DEFAULT 'kutilmoqda' CHECK (holat IN ('kutilmoqda', 'tolandi', 'bekor_qilindi')),
    tolov_provayderi VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    sana TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) - QAT'IY XAVFSIZLIK QOIDALARI
-- ==============================================================================

-- A. Barcha jadvallarda RLS ni yoqish
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_reg_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- B. Eski xavfli siyosatlarni tozalash
DROP POLICY IF EXISTS "Public users access" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users delete policy" ON public.profiles;
DROP POLICY IF EXISTS "Public listings access" ON public.listings;
DROP POLICY IF EXISTS "Public read active listings" ON public.listings;
DROP POLICY IF EXISTS "Users insert listing" ON public.listings;
DROP POLICY IF EXISTS "Owners update listing" ON public.listings;
DROP POLICY IF EXISTS "Admin or owner delete listing" ON public.listings;
DROP POLICY IF EXISTS "Telegram users full access" ON public.telegram_users;
DROP POLICY IF EXISTS "OTP codes full access" ON public.otp_codes;
DROP POLICY IF EXISTS "Bot reg sessions full access" ON public.bot_reg_sessions;
DROP POLICY IF EXISTS "Login requests insert policy" ON public.login_requests;
DROP POLICY IF EXISTS "Login requests update policy" ON public.login_requests;
DROP POLICY IF EXISTS "Login requests select policy" ON public.login_requests;

-- ------------------------------------------------------------------------------
-- C. PROFILES RLS SIYOSATLARI
-- ------------------------------------------------------------------------------
-- 1. SELECT: Foydalanuvchi faqat o'z profilini ko'radi, Admin esa barchasini
CREATE POLICY "Profiles select policy"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (
    id = auth.uid() OR public.is_admin()
);

-- 2. UPDATE: Foydalanuvchi faqat o'z profilini yangilaydi (is_admin ustunini trigger himoyalaydi)
CREATE POLICY "Profiles update policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- D. LISTINGS RLS SIYOSATLARI
-- ------------------------------------------------------------------------------
-- 1. SELECT:
--    - Anon va hamma: faqat 'faol' holatdagi e'lonlarni ko'ra oladi
--    - E'lon egasi: o'zining har qanday (faol, kutilmoqda, rad etilgan) e'lonini ko'radi
--    - Admin: barcha e'lonlarni ko'radi
CREATE POLICY "Listings select policy"
ON public.listings FOR SELECT
TO anon, authenticated
USING (
    holat = 'faol'
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    OR public.is_admin()
);

-- 2. INSERT:
--    - Faqat ro'yxatdan o'tgan foydalanuvchi o'z nomidan e'lon joylaydi
--    - Holat har doim 'kutilmoqda' bo'ladi (faqat admin darhol 'faol' qila oladi)
CREATE POLICY "Listings insert policy"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
    AND (holat = 'kutilmoqda' OR public.is_admin())
);

-- 3. UPDATE:
--    - Faqat e'lon egasi (agar can_edit=true bo'lsa) YOKI admin tahrirlay oladi
CREATE POLICY "Listings update policy"
ON public.listings FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::text AND can_edit = true)
)
WITH CHECK (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- 4. DELETE:
--    - Faqat e'lon egasi yoki admin o'chira oladi
CREATE POLICY "Listings delete policy"
ON public.listings FOR DELETE
TO authenticated
USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- ------------------------------------------------------------------------------
-- E. MAXFIY JADVALLAR: anon VA authenticated UCHUN SIYOSAT YO'Q!
-- ------------------------------------------------------------------------------
-- otp_codes, telegram_users, bot_reg_sessions, login_requests jadvallariga
-- anon yoki authenticated foydalanuvchilar to'g'ridan-to'g'ri so'rov yubora olmaydi.
-- Ularga FAQAT Service Role (Edge Function'lar va bot-daemon) ruxsatga ega.

-- ------------------------------------------------------------------------------
-- F. PAYMENTS RLS SIYOSATLARI
-- ------------------------------------------------------------------------------
CREATE POLICY "Payments user select"
ON public.payments FOR SELECT
TO authenticated
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    OR public.is_admin()
);
