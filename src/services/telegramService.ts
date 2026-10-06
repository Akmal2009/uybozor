import { getSupabase } from './supabase';
import { fetchListingById } from './listingService';

// ============================================================================
// ⚙️ TELEGRAM BOT SOZLAMALARI (Faqat Ochiq Username'lar, Tokenlar Faqat Serverda)
// ============================================================================
const env = (import.meta as any).env || {};

export const TELEGRAM_CONFIG = {
  ADMIN_BOT_USERNAME: env.VITE_TELEGRAM_ADMIN_BOT_USERNAME || 'Uybozorinbot',
  USER_BOT_USERNAME: env.VITE_TELEGRAM_USER_BOT_USERNAME || 'uybozorcodebot',

  // Orqaga moslik uchun (UI komponentlar username'dan havola yasashi uchun)
  get BOT_USERNAME() { return this.USER_BOT_USERNAME; },
  get BOT_TOKEN() { return ''; },
  get ADMIN_CHAT_ID() { return ''; },
  get ADMIN_BOT_TOKEN() { return ''; },
  get USER_BOT_TOKEN() { return ''; }
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

export const getActiveAdminChatId = (): string => {
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
  summa?: number;
  maydon?: number;
  xonalar?: number;
  vipRequested?: boolean;
}

/**
 * 1. Yangi e'lon joylashtirilganda Supabase Edge Function orqali adminga xabar yuborish
 */
export const sendTelegramNotification = async (
  listing: ListingNotificationData
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase xizmati ulanmagan' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('notify-admin', {
      body: {
        type: 'new_listing',
        data: listing
      }
    });

    if (error) {
      console.warn('[Telegram] notify-admin invoke xatosi:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Telegram] sendTelegramNotification error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * 2. Admin login 2FA so'rovini Supabase Edge Function orqali adminga yuborish
 */
export const sendAdminLoginTelegramNotification = async (
  requestId: string,
  adminName: string,
  adminPhone: string
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase xizmati ulanmagan' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('notify-admin', {
      body: {
        type: 'admin_login_2fa',
        data: {
          id: requestId,
          userName: adminName,
          userPhone: adminPhone
        }
      }
    });

    if (error) {
      console.warn('[Telegram] notify-admin 2FA invoke xatosi:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * 3. Tahrirlash ruxsat so'rovi (Edge Function orqali)
 */
export const requestEditPermission = async (listingId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const listing = await fetchListingById(listingId);
    const { data, error } = await supabase.functions.invoke('notify-admin', {
      body: {
        type: 'edit_request',
        data: {
          id: listingId,
          shahar: listing?.shahar || '',
          manzil: listing?.manzil_matn || '',
          telefon: listing?.telefon || ''
        }
      }
    });

    if (error) {
      console.warn('[Telegram] requestEditPermission error:', error);
      return false;
    }

    return data?.success ?? true;
  } catch (e) {
    console.error('requestEditPermission xatosi:', e);
    return false;
  }
};

/**
 * 3.1. VIP maqomini olish so'rovi (Edge Function orqali)
 */
export const requestVipPermission = async (listingId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const listing = await fetchListingById(listingId);
    const { data, error } = await supabase.functions.invoke('notify-admin', {
      body: {
        type: 'vip_request',
        data: {
          id: listingId,
          shahar: listing?.shahar || '',
          manzil: listing?.manzil_matn || '',
          telefon: listing?.telefon || '',
          narx: listing?.narx,
          valyuta: listing?.valyuta
        }
      }
    });

    if (error) {
      console.warn('[Telegram] requestVipPermission error:', error);
      return false;
    }

    return data?.success ?? true;
  } catch (e) {
    console.error('requestVipPermission xatosi:', e);
    return false;
  }
};

/**
 * 4. Telegram orqali 6 xonali OTP tasdiqlash kodini yuborish (Server-side Edge Function)
 * DIQQAT: Xavfsizlik qoidasi: Kod hech qachon mijozga qaytmaydi!
 */
export const sendTelegramOtpCode = async (
  phone: string,
  purposeOrName?: string,
  maybeName?: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('Iltimos, to\'g\'ri telefon raqam kiriting.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase xizmati mavjud emas.');
  }

  const { data, error } = await supabase.functions.invoke('send-otp', {
    body: { phone: cleanPhone }
  });

  if (error) {
    console.error('[sendTelegramOtpCode] invoke error:', error);
    throw new Error(error.message || 'Kod yuborishda xatolik yuz berdi');
  }

  if (!data?.success) {
    if (data?.error === 'telegram_not_linked') {
      const botUrl = data.bot_url || getTelegramBotOtpLink(cleanPhone);
      throw new Error(`Telegram botingiz hali ulanmagan! Iltimos, avval botimizga o'tib /start bosing: ${botUrl}`);
    }
    throw new Error(data?.error || 'Kod yuborib bo\'lmadi');
  }

  return { success: true };
};

/**
 * 5. Kiritilgan OTP kodni tekshirish (Faqat Server-side Edge Function orqali)
 */
export const verifyTelegramOtpCode = async (phone: string, inputCode: string): Promise<boolean> => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const cleanInput = (inputCode || '').trim();
  if (!cleanPhone || !cleanInput) return false;

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase xizmati topilmadi');
  }

  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: {
      phone: cleanPhone,
      code: cleanInput
    }
  });

  if (error) {
    throw new Error(error.message || 'Kodni tekshirishda xatolik yuz berdi');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Noto\'g\'ri tasdiqlash kodi kiritildi');
  }

  return true;
};
