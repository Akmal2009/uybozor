-- ==============================================================================
-- UY BOZOR: ESKI FOYDALANUVCHILARNI YANGI SXEMAGA KO'CHIRISH (MIGRATSIYA)
-- ==============================================================================
-- Ushbu skript mavjud public.users jadvalidagi ma'lumotlarni
-- public.profiles jadvaliga xavfsiz ko'chirish va sinxronlashtirish uchun xizmat qiladi.

-- 1. Agar profiles jadvali yaratilmagan bo'lsa, yaratish
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

-- 2. Agar users jadvali mavjud bo'lsa va auth.users bilan bog'langan foydalanuvchilar bo'lsa:
-- Eski users jadvalidan profiles ga ma'lumotlarni nusxalash:
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- profiles jadvalini to'ldirish
        INSERT INTO public.profiles (id, ism, telefon, email, avatar_url, is_admin, is_blocked, yaratilgan_sana)
        SELECT 
            u.id::uuid,
            u.ism,
            u.telefon,
            u.email,
            u.avatar_url,
            COALESCE(u.is_admin, false),
            COALESCE(u.is_blocked, false),
            COALESCE(u.yaratilgan_sana, NOW())
        FROM public.users u
        WHERE u.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id::uuid)
        ON CONFLICT (id) DO UPDATE
        SET ism = EXCLUDED.ism,
            telefon = EXCLUDED.telefon,
            is_admin = EXCLUDED.is_admin;
            
        RAISE NOTICE 'Eski users jadvalidan profiles ga sinxronlandi.';
    END IF;
END $$;
