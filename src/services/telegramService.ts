import { getSupabase } from './supabase';
import { updateListing, deleteListing, fetchListingById } from './listingService';
import { updateLoginRequestStatus } from './adminService';

// ============================================================================
// ⚙️ TELEGRAM BOT SOZLAMALARI (VITE ENVIRONMENT VARIABLES)
// ============================================================================
const env = (import.meta as any).env || {};

export const TELEGRAM_CONFIG = {
  BOT_TOKEN: env.VITE_TELEGRAM_BOT_TOKEN || '8518990743:AAHFTvp4Qtku_v4St7SQLYj37dhtntgWOHY',
  ADMIN_CHAT_ID: env.VITE_ADMIN_CHAT_ID || '8500341142', // Haqiqiy Bosh Admin Chat ID
  BOT_USERNAME: env.VITE_TELEGRAM_BOT_USERNAME || 'Uybozorinbot'
};

export const getTelegramBotLink = (): string => {
  const username = TELEGRAM_CONFIG.BOT_USERNAME || 'Uybozorinbot';
  return `https://t.me/${username.replace('@', '')}`;
};

// Shaxsiy Haqiqiy Admin Chat ID ni olish (Faqat haqiqiy adminga yuboriladi)
export const getActiveAdminChatId = (): string => {
  return TELEGRAM_CONFIG.ADMIN_CHAT_ID;
};

// Foydalanuvchining shaxsiy Telegram Chat ID sini olish (agar bot bilan bog'langan bo'lsa)
export const getUserChatId = (phone: string): string => {
  const cleanPhone = phone.replace(/\s+/g, '');
  const userChatId = typeof localStorage !== 'undefined' ? localStorage.getItem(`user_tg_chat_${cleanPhone}`) : null;
  if (userChatId && userChatId.trim() !== '') {
    return userChatId;
  }
  const latestUserChatId = typeof localStorage !== 'undefined' ? localStorage.getItem('user_latest_tg_chat_id') : null;
  if (latestUserChatId && latestUserChatId.trim() !== '') {
    return latestUserChatId;
  }
  return getActiveAdminChatId();
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
  const token = TELEGRAM_CONFIG.BOT_TOKEN;
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
  const token = TELEGRAM_CONFIG.BOT_TOKEN;
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
  const token = TELEGRAM_CONFIG.BOT_TOKEN;
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
  const token = TELEGRAM_CONFIG.BOT_TOKEN;
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
  name?: string,
  purpose: string = 'Ro\'yxatdan o\'tish'
): Promise<{ success: boolean; code: string; error?: string }> => {
  const token = TELEGRAM_CONFIG.BOT_TOKEN;
  const targetChatId = getUserChatId(phone);

  // 4 xonali tasodifiy maxfiy kod (masalan, 5821)
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const cleanPhone = phone.replace(/\s+/g, '');

  // Kodni xotirada 5 daqiqaga saqlash
  const otpData = {
    code,
    phone: cleanPhone,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 daqiqa
  };

  try {
    localStorage.setItem(`uybozor_otp_${cleanPhone}`, JSON.stringify(otpData));
    localStorage.setItem('uybozor_latest_otp', JSON.stringify(otpData));
  } catch (e) {
    // fallback
  }

  const messageText = `
🔐 <b>"Arzon Uy" Tasdiqlash Kodi</b>

👤 <b>Foydalanuvchi:</b> ${name || 'Foydalanuvchi'}
📱 <b>Telefon raqam:</b> <code>${phone}</code>
🎯 <b>Maqsad:</b> ${purpose}

🔑 <b>TASDIQLASH KODI:</b> <code>${code}</code>

⏳ <i>Ushbu 4 xonali kod 5 daqiqa davomida amal qiladi. Saytga aynan shu kodni kiriting.</i>
`.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: messageText,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return { success: true, code };
  } catch (err: any) {
    return { success: true, code };
  }
};

/**
 * 5. Kiritilgan OTP kodni tekshirish
 */
export const verifyTelegramOtpCode = (phone: string, inputCode: string): boolean => {
  const cleanPhone = phone.replace(/\s+/g, '');
  const rawData = localStorage.getItem(`uybozor_otp_${cleanPhone}`) || localStorage.getItem('uybozor_latest_otp');

  if (!rawData) {
    return false;
  }

  try {
    const { code, expiresAt } = JSON.parse(rawData);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(`uybozor_otp_${cleanPhone}`);
      localStorage.removeItem('uybozor_latest_otp');
      throw new Error('Tasdiqlash kodining amal qilish muddati tugagan! Iltimos, yangi kod so\'rang.');
    }

    if (code.trim() === inputCode.trim()) {
      localStorage.removeItem(`uybozor_otp_${cleanPhone}`);
      localStorage.removeItem('uybozor_latest_otp');
      return true;
    }

    return false;
  } catch (e: any) {
    if (e.message && e.message.includes('muddati')) {
      throw e;
    }
    return false;
  }
};

export const handleApproval = async (listingId: string, status: 'faol' | 'rad_etildi'): Promise<boolean> => {
  try {
    await updateListing(listingId, { holat: status });
    return true;
  } catch (err) {
    return false;
  }
};

// Polling jarayoni
let isPollingActive = false;
let lastUpdateId = 0;

export const startTelegramBotPolling = () => {
  if (isPollingActive) return;
  isPollingActive = true;

  const token = TELEGRAM_CONFIG.BOT_TOKEN;
  if (!token || token.trim() === '') return;

  const poll = async () => {
    if (!isPollingActive) return;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            lastUpdateId = update.update_id;

            // Foydalanuvchi botga xabar yozganda
            if (update.message && update.message.chat) {
              const userChatId = update.message.chat.id.toString();
              const text = update.message.text || '';
              const userName = update.message.from?.first_name || 'Foydalanuvchi';
              const isAdminUser = userChatId === TELEGRAM_CONFIG.ADMIN_CHAT_ID;

              // Agar oddiy foydalanuvchi bo'lsa, uning chat ID sini OTP uchun saqlaymiz (Adminga daxl qilmaydi)
              if (!isAdminUser) {
                localStorage.setItem('user_latest_tg_chat_id', userChatId);
              }

              if (text.startsWith('/start')) {
                if (isAdminUser) {
                  try {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: userChatId,
                        text: `👨‍💼 <b>Assalomu alaykum, Bosh Administrator (${userName})!</b>\n\n✅ Sayt boshqaruvi, yangi e'lonlar, VIP so'rovlari va 2FA login tasdiqlashlari FAQAT sizning ushbu Telegramingizga yuboriladi.`,
                        parse_mode: 'HTML'
                      })
                    });
                  } catch (e) {
                    console.error('Admin /start xatosi:', e);
                  }
                } else {
                  // Oddiy foydalanuvchi uchun OTP yoki xush kelibsiz xabari
                  const latestOtpRaw = localStorage.getItem('uybozor_latest_otp');
                  let otpMessage = '';
                  if (latestOtpRaw) {
                    try {
                      const otpParsed = JSON.parse(latestOtpRaw);
                      if (Date.now() <= otpParsed.expiresAt) {
                        otpMessage = `\n\n🔐 <b>Sizning tasdiqlash kodingiz:</b> <code>${otpParsed.code}</code>\n\n<i>Ushbu 4 xonali kodni saytdagi oynaga kiriting.</i>`;
                      }
                    } catch {}
                  }

                  try {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: userChatId,
                        text: `👋 <b>Assalomu alaykum, ${userName}!</b>\n\n"Arzon Uy" tizimiga xush kelibsiz!${otpMessage || '\n\nSaytda ro\'yxatdan o\'tayotganda tasdiqlash kodlari shu yerga yuboriladi.'}`,
                        parse_mode: 'HTML'
                      })
                    });
                  } catch (e) {
                    console.error('/start javob xatosi:', e);
                  }
                }
              }
            }

            // Inline tugmalar bosilganda
            if (update.callback_query) {
              const callback = update.callback_query;
              const callbackSenderId = callback.from?.id ? callback.from.id.toString() : '';
              const callbackData: string = callback.data || '';
              const callbackId: string = callback.id;
              const message = callback.message;

              // Tugmalarni faqat haqiqiy ADMIN bosa oladi!
              if (callbackSenderId !== TELEGRAM_CONFIG.ADMIN_CHAT_ID) {
                try {
                  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      callback_query_id: callbackId,
                      text: '⛔ Ruxsat berilmadi! Siz administrator emassiz.',
                      show_alert: true
                    })
                  });
                } catch (e) {}
                continue;
              }

              let actionText = '';

              if (callbackData.startsWith('approve_login_')) {
                const reqId = callbackData.replace('approve_login_', '');
                await updateLoginRequestStatus(reqId, 'tasdiqlangan');
                actionText = '✅ Admin panelga kirishga ruxsat berildi!';
              } else if (callbackData.startsWith('reject_login_')) {
                const reqId = callbackData.replace('reject_login_', '');
                await updateLoginRequestStatus(reqId, 'rad_etilgan');
                actionText = '❌ Admin panelga kirish rad etildi.';
              } else if (callbackData.startsWith('approve_vip_')) {
                const listingId = callbackData.replace('approve_vip_', '');
                await updateListing(listingId, { holat: 'faol', is_vip: true, vip_requested: false });
                actionText = '⭐ E\'lon VIP maqomida tasdiqlandi va saytda faollashdi!';
              } else if (callbackData.startsWith('reject_vip_')) {
                const listingId = callbackData.replace('reject_vip_', '');
                await updateListing(listingId, { vip_requested: false });
                actionText = '❌ VIP maqomi so\'rovi rad etildi.';
              } else if (callbackData.startsWith('approve_')) {
                const listingId = callbackData.replace('approve_', '');
                await handleApproval(listingId, 'faol');
                actionText = '✅ E\'lon admin tomonidan tasdiqlandi va saytda faol qilindi!';
              } else if (callbackData.startsWith('reject_')) {
                const listingId = callbackData.replace('reject_', '');
                await handleApproval(listingId, 'rad_etildi');
                actionText = '❌ E\'lon admin tomonidan rad etildi.';
              } else if (callbackData.startsWith('delete_')) {
                const listingId = callbackData.replace('delete_', '');
                await deleteListing(listingId);
                actionText = '🗑 E\'lon admin tomonidan butunlay o\'chirildi!';
              } else if (callbackData.startsWith('allow_edit_')) {
                const listingId = callbackData.replace('allow_edit_', '');
                await updateListing(listingId, { can_edit: true, edit_requested: false });
                actionText = '✅ Foydalanuvchiga e\'lonni 1 marta tahrirlash uchun ruxsat berildi!';
              } else if (callbackData.startsWith('deny_edit_')) {
                const listingId = callbackData.replace('deny_edit_', '');
                await updateListing(listingId, { can_edit: false, edit_requested: false });
                actionText = '❌ Tahrirlash so\'rovi admin tomonidan rad etildi.';
              }

              if (actionText) {
                try {
                  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      callback_query_id: callbackId,
                      text: actionText,
                      show_alert: true
                    })
                  });
                } catch (e) {}

                if (message && message.chat && message.message_id) {
                  try {
                    const updatedText = `${message.text}\n\n━━━━━━━━━━━━━━━\n<b>QAROR:</b> ${actionText}`;
                    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: message.chat.id,
                        message_id: message.message_id,
                        text: updatedText,
                        parse_mode: 'HTML'
                      })
                    });
                  } catch (e) {}
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // Tarmoq xatosi bo'lsa
    } finally {
      if (isPollingActive) {
        setTimeout(poll, 3000);
      }
    }
  };

  poll();
};
