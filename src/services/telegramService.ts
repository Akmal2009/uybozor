import { getSupabase } from './supabase';
import { fetchListingById } from './listingService';

// ============================================================================
// ⚙️ TELEGRAM BOT SOZLAMALARI (VITE ENVIRONMENT VARIABLES)
// ============================================================================
const env = (import.meta as any).env || {};

export const TELEGRAM_CONFIG = {
  // 1. ADMIN BOT (Ruxsat so'rash boti: e'lon moderatsiyasi, 2FA admin kirish, tahrirlash so'rovi)
  ADMIN_BOT_TOKEN: env.VITE_TELEGRAM_ADMIN_BOT_TOKEN || env.VITE_TELEGRAM_BOT_TOKEN || '',
  ADMIN_CHAT_ID: env.VITE_ADMIN_CHAT_ID || '',
  ADMIN_BOT_USERNAME: env.VITE_TELEGRAM_ADMIN_BOT_USERNAME || 'Uybozorinbot',

  // 2. USER BOT (Foydalanuvchi Kod Boti: faqat ro'yxatdan o'tish va parolni tiklash kodi uchun)
  USER_BOT_TOKEN: env.VITE_TELEGRAM_USER_BOT_TOKEN || '',
  USER_BOT_USERNAME: env.VITE_TELEGRAM_USER_BOT_USERNAME || 'uybozorcodebot',

  // Orqaga moslik uchun
  get BOT_TOKEN() { return this.ADMIN_BOT_TOKEN; },
  get BOT_USERNAME() { return this.USER_BOT_USERNAME; }
};

export const getTelegramBotLink = (): string => {
  const username = TELEGRAM_CONFIG.USER_BOT_USERNAME || 'uybozorcodebot';
  return `https://t.me/${username.replace('@', '')}`;
};

// Telegram orqali botni ochish va telefon orqali ulash linki
export const getTelegramBotOtpLink = (phone?: string): string => {
  const username = TELEGRAM_CONFIG.USER_BOT_USERNAME || 'uybozorcodebot';
  const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
  if (cleanPhone) {
    return `https://t.me/${username.replace('@', '')}?start=${cleanPhone}`;
  }
  return `https://t.me/${username.replace('@', '')}`;
};

// Shaxsiy Haqiqiy Admin Chat ID ni olish (Faqat haqiqiy adminga yuboriladi)
export const getActiveAdminChatId = (): string => {
  return TELEGRAM_CONFIG.ADMIN_CHAT_ID;
};

// Foydalanuvchining shaxsiy Telegram Chat ID sini olish (agar bot bilan bog'langan bo'lsa)
// DIQQAT: Hech qachon Admin Chat ID sini qaytarmaydi! Foydalanuvchiga faqat o'z kodi boradi.
export const getUserChatId = async (phone: string): Promise<string> => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  if (!cleanPhone) return '';

  // 1. Avval Supabase telegram_users jadvalidan tekshiramiz
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('chat_id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!error && data?.chat_id && data.chat_id !== TELEGRAM_CONFIG.ADMIN_CHAT_ID) {
        return data.chat_id;
      }
    } catch (e) {
      console.warn('[Telegram] Supabase telegram_users check error:', e);
    }
  }

  // 2. Fallback: localStorage keshidan tekshiramiz
  const userChatId = typeof localStorage !== 'undefined' ? localStorage.getItem(`user_tg_chat_${cleanPhone}`) : null;
  if (userChatId && userChatId.trim() !== '') {
    if (userChatId !== TELEGRAM_CONFIG.ADMIN_CHAT_ID) {
      return userChatId;
    }
  }
  return '';
};

export interface ListingNotificationData {
  id: string;
  turi: string;
  manzil: string;
  shahar: string;
  narx: number;
  valyuta: string;
  telefon: string;
  summa: number;
  maydon?: number;
  xonalar?: number;
  vipRequested?: boolean;
}

/**
 * 1. Yangi e'lon joylashtirilganda Telegram bot orqali adminga xabar va inline tugmalar yuborish
 */
export const sendTelegramNotification = async (
  listing: ListingNotificationData
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const token = TELEGRAM_CONFIG.ADMIN_BOT_TOKEN;
  const chatId = getActiveAdminChatId();

  if (!token || token.includes('your_bot_token') || token.trim() === '') {
    const errorMsg = 'XATO: VITE_TELEGRAM_BOT_TOKEN topilmadi yoki to\'g\'ri kiritilmagan. .env.local faylni tekshiring!';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Xabar matni
  const messageText = `
🔔 <b>Yangi e'lon joylashtirildi!</b>${listing.vipRequested ? '\n⭐ <b>FOYDALANUVCHI VIP MAQOMINI SO\'RAMOQDA!</b>' : ''}

🏠 <b>E'lon turi:</b> ${listing.turi.toUpperCase()}
📍 <b>Manzil:</b> ${listing.shahar}, ${listing.manzil}
${listing.maydon ? `📐 <b>Maydon:</b> ${listing.maydon} m² (${listing.xonalar || 1} xona)\n` : ''}💰 <b>Uy narxi:</b> ${listing.narx.toLocaleString()} ${listing.valyuta}
📱 <b>Bog'lanish:</b> ${listing.telefon}
🆔 <b>E'lon ID:</b> <code>${listing.id}</code>
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}

<i>Ushbu e'lonni tasdiqlaysizmi yoki rad etasizmi?</i>
`.trim();

  // Inline tugmalar
  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ Oddiy faol qilish',
          callback_data: `approve_${listing.id}`
        },
        {
          text: '⭐ VIP qilib faollashtirish',
          callback_data: `approve_vip_${listing.id}`
        }
      ],
      [
        {
          text: '❌ Rad etish',
          callback_data: `reject_${listing.id}`
        },
        {
          text: '🗑 O\'chirish',
          callback_data: `delete_${listing.id}`
        }
      ]
    ]
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    const result = await response.json();

    if (!result.ok) {
      return { success: false, error: result.description };
    }

    return { success: true, data: result.result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * 2. Admin login 2FA so'rovini Telegram orqali yuborish
 */
export const sendAdminLoginTelegramNotification = async (
  requestId: string,
  adminName: string,
  adminPhone: string
): Promise<{ success: boolean; error?: string }> => {
  const token = TELEGRAM_CONFIG.ADMIN_BOT_TOKEN;
  const chatId = getActiveAdminChatId();

  const messageText = `
🔐 <b>Admin Panelga kirish so'rovi!</b>

👤 <b>Admin:</b> ${adminName}
📱 <b>Login/Telefon:</b> ${adminPhone}
🆔 <b>So'rov ID:</b> <code>${requestId}</code>
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}

<i>Admin panelga kirishga ruxsat berasizmi?</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ Ruxsat berish',
          callback_data: `approve_login_${requestId}`
        },
        {
          text: '❌ Rad etish',
          callback_data: `reject_login_${requestId}`
        }
      ]
    ]
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    const result = await response.json();
    return { success: result.ok, error: result.ok ? undefined : result.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * 3. Tahrirlash ruxsat so'rovi
 */
export const requestEditPermission = async (listingId: string): Promise<boolean> => {
  const token = TELEGRAM_CONFIG.ADMIN_BOT_TOKEN;
  const chatId = getActiveAdminChatId();

  const listing = await fetchListingById(listingId);
  const title = listing ? `${listing.shahar}, ${listing.manzil_matn}` : listingId;
  const userPhone = listing ? listing.telefon : "Noma'lum";

  const messageText = `
✏️ <b>E'lonni tahrirlash uchun ruxsat so'rovi!</b>

🏠 <b>E'lon:</b> ${title}
📱 <b>Telefon:</b> ${userPhone}
🆔 <b>E'lon ID:</b> <code>${listingId}</code>
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}

<i>Foydalanuvchiga e'lonni 1 marta tahrirlash uchun ruxsat berasizmi?</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ Tahrirlashga ruxsat (1 marta)',
          callback_data: `allow_edit_${listingId}`
        },
        {
          text: '❌ Rad etish',
          callback_data: `deny_edit_${listingId}`
        }
      ]
    ]
  };

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });
    return true;
  } catch (e) {
    console.error('requestEditPermission xatosi:', e);
    return false;
  }
};

/**
 * 3.1. VIP maqomini olish so'rovi (Telegram orqali adminga yuborish)
 */
export const requestVipPermission = async (listingId: string): Promise<boolean> => {
  const token = TELEGRAM_CONFIG.ADMIN_BOT_TOKEN;
  const chatId = getActiveAdminChatId();

  const listing = await fetchListingById(listingId);
  const title = listing ? `${listing.shahar}, ${listing.manzil_matn}` : listingId;
  const userPhone = listing ? listing.telefon : "Noma'lum";

  const messageText = `
⭐ <b>VIP Maqomini Olish So'rovi!</b>

🏠 <b>E'lon:</b> ${title}
💰 <b>Narx:</b> ${listing ? `${listing.narx.toLocaleString()} ${listing.valyuta}` : ''}
📱 <b>Telefon:</b> ${userPhone}
🆔 <b>E'lon ID:</b> <code>${listingId}</code>
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}

<i>Foydalanuvchi ushbu e'lonni VIP (Premium) maqomiga o'tkazishni so'ramoqda. Ruxsat berasizmi?</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '⭐ VIP maqomini berish',
          callback_data: `approve_vip_${listingId}`
        },
        {
          text: '❌ Rad etish',
          callback_data: `reject_vip_${listingId}`
        }
      ]
    ]
  };

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });
    return true;
  } catch (e) {
    console.error('requestVipPermission xatosi:', e);
    return false;
  }
};

/**
 * 4. Telegram orqali 4 xonali OTP tasdiqlash kodini yuborish
 */
export const sendTelegramOtpCode = async (
  phone: string,
  purposeOrName?: string,
  maybeName?: string
): Promise<{ success: boolean; code: string; error?: string }> => {
  const token = TELEGRAM_CONFIG.USER_BOT_TOKEN;
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const targetChatId = await getUserChatId(cleanPhone);

  const purpose = (purposeOrName && (purposeOrName.includes('o\'tish') || purposeOrName.includes('tiklash') || purposeOrName.includes('o\'zgartirish')))
    ? purposeOrName
    : (maybeName || 'Tasdiqlash');
  const name = maybeName || (!purposeOrName?.includes(' ') ? purposeOrName : 'Foydalanuvchi');

  // 4 xonali tasodifiy maxfiy kod (masalan, 5821)
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  // Kodni xotirada 5 daqiqaga saqlash
  const otpData = {
    code,
    phone: cleanPhone,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 daqiqa
  };

  // Supabase otp_codes jadvaliga yozish (faqat server bazasida saqlanadi, xavfsiz)
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase xizmati mavjud emas. Tasdiqlash kodi saqlanmadi.');
  }

  const { error: dbError } = await supabase.from('otp_codes').upsert({
    phone: cleanPhone,
    code,
    expires_at: new Date(otpData.expiresAt).toISOString()
  });

  if (dbError) {
    console.error('[Telegram OTP] Supabase otp_codes saqlashda xatolik:', dbError);
    throw new Error('Tasdiqlash kodini bazada saqlashda xatolik yuz berdi.');
  }

  const messageText = `
🔐 <b>"Arzon Uy" Tasdiqlash Kodi</b>

👤 <b>Foydalanuvchi:</b> ${name || 'Foydalanuvchi'}
📱 <b>Telefon raqam:</b> <code>${phone}</code>
🎯 <b>Maqsad:</b> ${purpose}

🔑 <b>TASDIQLASH KODI:</b> <code>${code}</code>

⏳ <i>Ushbu 4 xonali kod 5 daqiqa davomida amal qiladi. Saytga aynan shu kodni kiriting.</i>
`.trim();

  // 1. Agar foydalanuvchining o'z chat ID si mavjud bo'lsa, unga yuboramiz
  if (targetChatId && targetChatId.trim() !== '') {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: messageText,
          parse_mode: 'HTML'
        })
      });
    } catch (err: any) {}
  }

  // 2. Ro'yxatdan o'tishda kod darhol Telegram botga ham yetib borishi shart!
  if (!targetChatId || targetChatId !== TELEGRAM_CONFIG.ADMIN_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CONFIG.ADMIN_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML'
        })
      });
    } catch (err: any) {}
  }

  return { success: true, code };
};

/**
 * 5. Kiritilgan OTP kodni tekshirish (Faqat Supabase bazasidagi otp_codes jadvali orqali)
 * DIQQAT: Xavfsizlik maqsadida hech qanday localStorage fallback ishlatilmaydi!
 */
export const verifyTelegramOtpCode = async (phone: string, inputCode: string): Promise<boolean> => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const cleanInput = (inputCode || '').trim();
  if (!cleanPhone || !cleanInput) return false;

  const supabase = getSupabase();
  if (!supabase) {
    console.error('[Telegram OTP] Supabase ulanishi topilmadi!');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('code, expires_at')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    const isExpired = new Date(data.expires_at).getTime() < Date.now();
    if (isExpired) {
      await supabase.from('otp_codes').delete().eq('phone', cleanPhone);
      throw new Error('Tasdiqlash kodining amal qilish muddati tugagan! Iltimos, yangi kod so\'rang.');
    }

    if (data.code && data.code.trim() === cleanInput) {
      // Bir martalik kod muvaffaqiyatli ishlatilgach, darhol bazadan o'chiriladi
      await supabase.from('otp_codes').delete().eq('phone', cleanPhone);
      return true;
    }

    return false;
  } catch (e: any) {
    if (e.message && e.message.includes('muddati')) {
      throw e;
    }
    console.warn('[Telegram] Supabase otp_codes verify error:', e);
    return false;
  }
};


