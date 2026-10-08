import { User } from '../types';
import { getSupabase } from './supabase';

/**
 * Telefon raqamini xalqaro formatga normallashtirish (998...)
 */
export const normalizePhone = (phone: string): string => {
  let digits = (phone || '').replace(/[^\d]/g, '');
  if (digits.length === 9) {
    digits = '998' + digits;
  }
  return digits;
};

/**
 * Telefon raqamini Supabase Auth uchun xavfsiz email aliasiga o'tkazish
 */
export const phoneToAuthEmail = (phone: string): string => {
  const digits = normalizePhone(phone);
  return `${digits}@phone.uybozor.uz`;
};

/**
 * Telefon va email kiritishlarini Query Injection xavfidan himoyalash va normallashtirish
 */
export const sanitizePhone = (phone: string): string => {
  return normalizePhone(phone);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * 1. Yangi foydalanuvchini Supabase Auth orqali ro'yxatdan o'tkazish
 */
export const registerUser = async (
  ism: string,
  telefon: string,
  email?: string,
  parol?: string
): Promise<User> => {
  const cleanName = ism.trim();
  const cleanPhone = sanitizePhone(telefon);
  const userPassword = (parol || '').trim();

  // Validatsiyalar
  if (!cleanName || cleanName.length < 2) {
    throw new Error('Iltimos, to\'liq ismingizni kiriting (kamida 2 ta belgi).');
  }

  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('Iltimos, to\'g\'ri telefon raqam kiriting.');
  }

  // Parol minimal uzunligi (8+ belgi talabi)
  if (!userPassword || userPassword.length < 8) {
    throw new Error('Parol kamida 8 ta belgidan iborat bo\'lishi shart!');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase xizmati bilan aloqa yo\'q. Iltimos, internetni tekshiring.');
  }

  const authEmail = email && isValidEmail(email) ? email.trim().toLowerCase() : phoneToAuthEmail(cleanPhone);
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

  // Supabase Auth orqali ro'yxatdan o'tkazish
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: authEmail,
    password: userPassword,
    options: {
      data: {
        ism: cleanName,
        telefon: cleanPhone,
        avatar_url: avatarUrl
      }
    }
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
      throw new Error('Ushbu telefon raqam bilan allaqachon ro\'yxatdan o\'tilgan! Iltimos, tizimga kiring.');
    }
    throw new Error(`Ro'yxatdan o'tishda xatolik: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Foydalanuvchi hisobi yaratilmadi.');
  }

  const newUser: User = {
    id: authData.user.id,
    ism: cleanName,
    telefon: cleanPhone,
    email: email || undefined,
    avatar_url: avatarUrl,
    is_admin: false,
    is_blocked: false,
    yaratilgan_sana: authData.user.created_at || new Date().toISOString()
  };

  return newUser;
};

/**
 * 2. Supabase Auth orqali tizimga kirish (Login)
 */
export const loginUser = async (
  telefonYokiEmail: string,
  kiritilganParol?: string
): Promise<User> => {
  const rawInput = (telefonYokiEmail || '').trim();
  const password = (kiritilganParol || '').trim();

  if (!rawInput) {
    throw new Error('Telefon raqamingiz yoki emailingizni kiriting!');
  }

  if (!password) {
    throw new Error('Iltimos, parolingizni kiriting!');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase xizmati bilan aloqa yo\'q.');
  }

  const digits = sanitizePhone(rawInput);
  let authEmail = '';

  if (isValidEmail(rawInput)) {
    authEmail = rawInput.toLowerCase();
  } else if (digits.length >= 9) {
    authEmail = phoneToAuthEmail(digits);
  } else {
    throw new Error('To\'g\'ri telefon raqam yoki email kiriting!');
  }

  // 1. Supabase Auth orqali autentifikatsiya
  let authRes = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: password
  });

  // 2. Agar xato bo'lsa, 9 xonali / 12 xonali muqobil emailni ham sinab ko'rish
  if (authRes.error && digits.length >= 9) {
    const rawDigits = rawInput.replace(/[^\d]/g, '');
    const altDigits = rawDigits.length === 12 && rawDigits.startsWith('998') ? rawDigits.slice(3) : (rawDigits.length === 9 ? '998' + rawDigits : '');
    if (altDigits) {
      const altEmail = `${altDigits}@phone.uybozor.uz`;
      const altRes = await supabase.auth.signInWithPassword({
        email: altEmail,
        password: password
      });
      if (!altRes.error && altRes.data.user) {
        authRes = altRes;
      }
    }
  }

  // 3. Agar hali ham xato bo'lsa, server-side Edge Function (JIT Migration) orqali tekshirish
  if (authRes.error) {
    try {
      const { data: jitData, error: jitErr } = await supabase.functions.invoke('admin-auth', {
        body: {
          action: 'user_fallback_login',
          phone: digits,
          password: password
        }
      });

      if (!jitErr && jitData?.success) {
        const retryRes = await supabase.auth.signInWithPassword({
          email: jitData.email || authEmail,
          password: jitData.authPassword || password
        });
        if (!retryRes.error && retryRes.data.user) {
          authRes = retryRes;
        }
      }
    } catch (e) {
      console.warn('[authService] JIT login check notice:', e);
    }
  }

  if (authRes.error) {
    if (authRes.error.message.includes('Invalid login credentials')) {
      throw new Error('Telefon raqam yoki parol noto\'g\'ri kiritildi!');
    }
    throw new Error(authRes.error.message);
  }

  const authData = authRes.data;

  if (!authData.user) {
    throw new Error('Foydalanuvchi ma\'lumotlarini yuklab bo\'lmadi.');
  }

  // Profil ma'lumotlarini profiles jadvalidan olish
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    throw new Error('Hisobingiz ma\'muriyat tomonidan bloklangan!');
  }

  const userMeta = authData.user.user_metadata || {};
  const loggedInUser: User = {
    id: authData.user.id,
    ism: profile?.ism || userMeta.ism || 'Foydalanuvchi',
    telefon: profile?.telefon || userMeta.telefon || digits,
    email: profile?.email || authData.user.email,
    avatar_url: profile?.avatar_url || userMeta.avatar_url,
    is_admin: Boolean(profile?.is_admin),
    is_blocked: Boolean(profile?.is_blocked),
    yaratilgan_sana: profile?.yaratilgan_sana || authData.user.created_at
  };

  return loggedInUser;
};

/**
 * 3. Hozirgi kirgan foydalanuvchi sessiyasini olish (Supabase Auth yagona manba)
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      return null;
    }

    const authUser = session.user;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      return null;
    }

    const userMeta = authUser.user_metadata || {};
    return {
      id: authUser.id,
      ism: profile?.ism || userMeta.ism || 'Foydalanuvchi',
      telefon: profile?.telefon || userMeta.telefon || '',
      email: profile?.email || authUser.email,
      avatar_url: profile?.avatar_url || userMeta.avatar_url,
      is_admin: Boolean(profile?.is_admin),
      is_blocked: Boolean(profile?.is_blocked),
      yaratilgan_sana: profile?.yaratilgan_sana || authUser.created_at
    };
  } catch (err) {
    console.warn('[authService] getCurrentUser error:', err);
    return null;
  }
};

/**
 * 4. Tizimdan chiqish (Logout)
 */
export const logoutUser = async (): Promise<void> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[authService] signOut error:', e);
    }
  }
};

/**
 * 5. Parolni yangilash (Parolni tiklash yoki o'zgartirish)
 */
export const resetUserPassword = async (
  telefon: string,
  yangiParol: string
): Promise<boolean> => {
  const cleanPhone = sanitizePhone(telefon);
  const cleanPassword = (yangiParol || '').trim();

  if (cleanPassword.length < 8) {
    throw new Error('Yangi parol kamida 8 ta belgidan iborat bo\'lishi shart!');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase xizmati bilan aloqa yo\'q.');
  }

  // Agar foydalanuvchi tizimga kirgan bo'lsa:
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase.auth.updateUser({
      password: cleanPassword
    });
    if (error) throw new Error(`Parolni yangilab bo'lmadi: ${error.message}`);
    return true;
  }

  // Agar tizimga kirmagan bo'lsa (Parolni unutdim oqimi):
  // Server-side Edge Function orqali xavfsiz parolni yangilash
  const { data, error } = await supabase.functions.invoke('admin-auth', {
    body: {
      action: 'reset_user_password',
      phone: cleanPhone,
      new_password: cleanPassword
    }
  });

  if (error || !data?.success) {
    // Agar maxsus endpoint bo'lmasa, qayta login qilishni so'raymiz
    throw new Error(data?.error || 'Parolni yangilashda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
  }

  return true;
};

/**
 * 6. Foydalanuvchi o'z profilini yangilashi
 */
export const updateUserProfile = async (
  userId: string,
  updatedData: Partial<User>
): Promise<User> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase ulanishi mavjud emas');

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser || authUser.id !== userId) {
    throw new Error('Ruxsat etilmagan: Faqat o\'z profilingizni yangilashingiz mumkin.');
  }

  // Xavfsizlik: is_admin yoki is_blocked ni oddiy foydalanuvchi o'zgartira olmaydi
  const profilePayload: any = {
    updated_at: new Date().toISOString()
  };

  if (updatedData.ism) profilePayload.ism = updatedData.ism.trim();
  if (updatedData.telefon) profilePayload.telefon = sanitizePhone(updatedData.telefon);
  if (updatedData.email) profilePayload.email = updatedData.email.trim();
  if (updatedData.avatar_url) profilePayload.avatar_url = updatedData.avatar_url;

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update(profilePayload)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Profilni saqlashda xatolik: ${error.message}`);
  }

  return {
    id: userId,
    ism: updatedProfile.ism,
    telefon: updatedProfile.telefon,
    email: updatedProfile.email,
    avatar_url: updatedProfile.avatar_url,
    is_admin: Boolean(updatedProfile.is_admin),
    is_blocked: Boolean(updatedProfile.is_blocked),
    yaratilgan_sana: updatedProfile.yaratilgan_sana
  };
};

/**
 * 7. Bir martalik xavfsiz Token orqali avtomatik kirish
 * Eski token_ hiylasi o'rniga Supabase Auth sessiyasi o'rnatiladi.
 */
export const authenticateWithToken = async (authToken: string): Promise<User | null> => {
  if (!authToken || !authToken.trim()) return null;
  const cleanToken = authToken.trim();
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // Agar token Supabase magic link / OTP token hash bo'lsa
    if (cleanToken.startsWith('pkce_') || cleanToken.length > 30) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: cleanToken,
        type: 'magiclink'
      });
      if (!error && data?.user) {
        return await getCurrentUser();
      }
    }

    // Server-side Edge function orqali tokenni tekshirish va sessiya olish
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { action: 'exchange_token', token: cleanToken }
    });

    if (!error && data?.magic_link) {
      window.location.href = data.magic_link;
      return null;
    }

    if (!error && data?.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      return await getCurrentUser();
    }
  } catch (err) {
    console.warn('[authService] authenticateWithToken error:', err);
  }

  return null;
};
