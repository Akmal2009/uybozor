// scripts/bot-daemon.js
// Standalone Telegram Bot Daemon for Uy Bozor
// Handles:
// 1. Admin Bot Moderation (2FA login approvals, listing approvals, VIP requests, edit requests)
// 2. User Bot Services (Full Registration in Telegram, OTP delivery)

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dns from 'dns';

// Force IPv4 first to avoid IPv6 network timeouts with api.telegram.org
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Native .env.local parser (no external package needed)
function loadEnv() {
  const envFiles = [resolve(__dirname, '../.env.local'), resolve(__dirname, '../.env')];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}
loadEnv();

// Muhit o'zgaruvchilarini olish (Hech qanday hardcoded fallback kalitlar ishlatilmaydi!)
const USER_BOT_TOKEN = process.env.VITE_TELEGRAM_USER_BOT_TOKEN || process.env.TELEGRAM_USER_BOT_TOKEN || '';
const ADMIN_BOT_TOKEN = process.env.VITE_TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.VITE_ADMIN_CHAT_ID || process.env.ADMIN_CHAT_ID || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SITE_URL = process.env.SITE_URL || 'https://uy-bozor.uz';

console.log('====================================================');
console.log('       UY BOZOR TELEGRAM BOT SERVER DAEMON          ');
console.log('====================================================');

// Xavfsizlik tekshiruvi: kalitlar yetishmasa daemon to'xtashi shart
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Bot Daemon] ❌ XATO: SUPABASE_URL yoki SUPABASE_KEY topilmadi!');
  console.error('[Bot Daemon] Iltimos, .env.local faylida VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni to\'ldiring.');
  process.exit(1);
}

if (!USER_BOT_TOKEN && !ADMIN_BOT_TOKEN) {
  console.error('[Bot Daemon] ❌ XATO: Hech qanday Telegram bot tokeni topilmadi!');
  console.error('[Bot Daemon] Iltimos, VITE_TELEGRAM_USER_BOT_TOKEN yoki VITE_TELEGRAM_ADMIN_BOT_TOKEN ni sozlang.');
  process.exit(1);
}

console.log(`[Bot Daemon] Supabase URL: ${SUPABASE_URL}`);
console.log(`[Bot Daemon] Admin Chat ID: ${ADMIN_CHAT_ID ? ADMIN_CHAT_ID : '(sozlanmagan)'}`);
console.log(`[Bot Daemon] User Bot Token: ${USER_BOT_TOKEN ? USER_BOT_TOKEN.slice(0, 10) + '...' : '(yo\'q)'}`);
console.log(`[Bot Daemon] Admin Bot Token: ${ADMIN_BOT_TOKEN ? ADMIN_BOT_TOKEN.slice(0, 10) + '...' : '(yo\'q)'}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// In-memory registration session store (chatId -> { step, name, phone })
const sessions = new Map();

async function tgRequest(token, method, payload) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000)
    });
    return await res.json();
  } catch (err) {
    console.error(`[Bot Daemon] tgRequest ${method} error:`, err.message);
    return null;
  }
}

async function sendMessage(token, chatId, text, replyMarkup) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  return await tgRequest(token, 'sendMessage', payload);
}

async function editMessageText(token, chatId, messageId, text) {
  return await tgRequest(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML'
  });
}

async function answerCallbackQuery(token, callbackQueryId, text, showAlert = false) {
  return await tgRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || '',
    show_alert: showAlert
  });
}

// ============================================================================
// 1. ADMIN BOT MODERATSIYA LOGIKASI (Callback Query va Ruxsatlar)
// ============================================================================
async function handleAdminCallbackQuery(token, cb) {
  const senderId = cb.from?.id ? cb.from.id.toString() : '';
  const cbData = cb.data || '';
  const message = cb.message;

  console.log(`[Admin Bot] 🔘 Callback query from ${senderId}: ${cbData}`);

  // Tugmalarni faqat va faqat haqiqiy ADMIN bosa oladi!
  if (ADMIN_CHAT_ID && senderId !== ADMIN_CHAT_ID) {
    await answerCallbackQuery(token, cb.id, '⛔ Ruxsat berilmadi! Siz administrator emassiz.', true);
    return;
  }

  let actionText = '';

  try {
    if (cbData.startsWith('approve_login_')) {
      const reqId = cbData.replace('approve_login_', '');
      await supabase.from('login_requests').update({ status: 'tasdiqlangan' }).eq('id', reqId);
      actionText = '✅ Admin panelga kirishga ruxsat berildi!';
    } else if (cbData.startsWith('reject_login_')) {
      const reqId = cbData.replace('reject_login_', '');
      await supabase.from('login_requests').update({ status: 'rad_etilgan' }).eq('id', reqId);
      actionText = '❌ Admin panelga kirish rad etildi.';
    } else if (cbData.startsWith('approve_vip_')) {
      const listingId = cbData.replace('approve_vip_', '');
      await supabase.from('listings').update({ holat: 'faol', is_vip: true, vip_requested: false }).eq('id', listingId);
      actionText = '⭐ E\'lon VIP maqomida tasdiqlandi va saytda faollashdi!';
    } else if (cbData.startsWith('reject_vip_')) {
      const listingId = cbData.replace('reject_vip_', '');
      await supabase.from('listings').update({ vip_requested: false }).eq('id', listingId);
      actionText = '❌ VIP maqomi so\'rovi rad etildi.';
    } else if (cbData.startsWith('approve_')) {
      const listingId = cbData.replace('approve_', '');
      await supabase.from('listings').update({ holat: 'faol' }).eq('id', listingId);
      actionText = '✅ E\'lon admin tomonidan tasdiqlandi va saytda faol qilindi!';
    } else if (cbData.startsWith('reject_')) {
      const listingId = cbData.replace('reject_', '');
      await supabase.from('listings').update({ holat: 'rad_etildi' }).eq('id', listingId);
      actionText = '❌ E\'lon admin tomonidan rad etildi.';
    } else if (cbData.startsWith('delete_')) {
      const listingId = cbData.replace('delete_', '');
      await supabase.from('listings').delete().eq('id', listingId);
      actionText = '🗑 E\'lon admin tomonidan butunlay o\'chirildi!';
    } else if (cbData.startsWith('allow_edit_')) {
      const listingId = cbData.replace('allow_edit_', '');
      await supabase.from('listings').update({ can_edit: true, edit_requested: false }).eq('id', listingId);
      actionText = '✅ Foydalanuvchiga e\'lonni 1 marta tahrirlash uchun ruxsat berildi!';
    } else if (cbData.startsWith('deny_edit_')) {
      const listingId = cbData.replace('deny_edit_', '');
      await supabase.from('listings').update({ can_edit: false, edit_requested: false }).eq('id', listingId);
      actionText = '❌ Tahrirlash so\'rovi admin tomonidan rad etildi.';
    }
  } catch (err) {
    console.error('[Admin Bot] Database update error:', err.message);
  }

  if (actionText) {
    await answerCallbackQuery(token, cb.id, actionText, true);

    if (message?.chat?.id && message?.message_id) {
      try {
        const updatedText = `${message.text || ''}\n\n━━━━━━━━━━━━━━━\n<b>QAROR:</b> ${actionText}`;
        await editMessageText(token, message.chat.id, message.message_id, updatedText);
      } catch (e) {
        console.warn('[Admin Bot] editMessageText warning:', e.message);
      }
    }
  }
}

// ============================================================================
// 2. FOYDALANUVCHI BOT LOGIKASI (Ro'yxatdan o'tish va OTP)
// ============================================================================
async function handleUserUpdate(token, update) {
  // Callback query
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id?.toString() || cb.from?.id?.toString();
    const cbData = cb.data || '';

    // Agar admin callback query bo'lsa
    if (
      cbData.startsWith('approve_') ||
      cbData.startsWith('reject_') ||
      cbData.startsWith('allow_edit_') ||
      cbData.startsWith('deny_edit_') ||
      cbData.startsWith('delete_')
    ) {
      await handleAdminCallbackQuery(token, cb);
      return;
    }

    await answerCallbackQuery(token, cb.id);

    if (cbData === 'bot_reg_start') {
      sessions.set(chatId, { step: 'name' });
      try {
        await supabase.from('bot_reg_sessions').upsert({
          chat_id: chatId,
          step: 'name',
          updated_at: new Date().toISOString()
        });
      } catch {}

      await sendMessage(
        token,
        chatId,
        `📝 <b>Ro'yxatdan o'tish (1/3)</b>\n\nIltimos, to'liq <b>ism va familiyangizni</b> kiriting (masalan: <i>Ali Valiyev</i>):`
      );
    } else if (cbData === 'info_otp') {
      await sendMessage(
        token,
        chatId,
        `🔑 <b>Tasdiqlash kodi xizmati</b>\n\nSaytda ro'yxatdan o'tishda yoki parolni tiklashda telefon raqamingizni kiritib <b>"Telegramdan kod olish"</b> tugmasini bossangiz, 4 xonali bir martalik kod aynan shu yerga yuboriladi.`
      );
    }
    return;
  }

  // Message
  if (update.message && update.message.chat) {
    const msg = update.message;
    const chatId = msg.chat.id.toString();
    const text = (msg.text || '').trim();
    const firstName = msg.from?.first_name || 'Foydalanuvchi';
    const username = msg.from?.username || null;

    console.log(`[User Bot] 💬 Message from ${chatId} (${firstName}): ${text || (msg.contact ? 'Contact shared' : 'Other')}`);

    // /cancel buyrug'i
    if (text === '/cancel' || text.toLowerCase() === 'bekor') {
      sessions.delete(chatId);
      try {
        await supabase.from('bot_reg_sessions').delete().eq('chat_id', chatId);
      } catch {}
      await sendMessage(token, chatId, '❌ Jarayon bekor qilindi.', { remove_keyboard: true });
      return;
    }

    // /start buyrug'i
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const payloadRaw = parts.length > 1 ? parts[1].trim() : '';
      const payloadPhone = payloadRaw.replace(/[^\d]/g, '');

      // Agar saytdan to'g'ridan-to'g'ri ro'yxatdan o'tish linki orqali kelgan bo'lsa:
      if (payloadRaw === 'register') {
        sessions.set(chatId, { step: 'name' });
        try {
          await supabase.from('bot_reg_sessions').upsert({
            chat_id: chatId,
            step: 'name',
            updated_at: new Date().toISOString()
          });
        } catch {}

        await sendMessage(
          token,
          chatId,
          `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n🏢 <b>"Uy Bozor" tizimida ro'yxatdan o'tish (1/3)</b>\n\nIltimos, to'liq <b>ism va familiyangizni</b> kiriting (masalan: <i>Ali Valiyev</i>):`
        );
        return;
      }

      if (payloadPhone) {
        try {
          await supabase.from('telegram_users').upsert({
            phone: payloadPhone,
            chat_id: chatId,
            first_name: firstName,
            username: username,
            updated_at: new Date().toISOString()
          });

          const { data: otpData } = await supabase
            .from('otp_codes')
            .select('code, expires_at')
            .eq('phone', payloadPhone)
            .maybeSingle();

          if (otpData && new Date(otpData.expires_at).getTime() > Date.now()) {
            const otpMsg = `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n🏢 <b>"Uy Bozor" Tasdiqlash Kodi:</b>\n\n┌───────────────────┐\n  👉  <code>${otpData.code}</code>  👈\n└───────────────────┘\n<i>(Nusxalash uchun kod ustiga bosing)</i>\n\n📱 <b>Telefon:</b> <code>+${payloadPhone}</code>\n⏳ <i>Kod 5 daqiqa davomida amal qiladi. Saytga ushbu kodni kiriting.</i>`;

            await sendMessage(token, chatId, otpMsg, {
              inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: SITE_URL }]]
            });
            return;
          }
        } catch (e) {
          console.error('[User Bot] /start payload error:', e.message);
        }
      }

      // Oddiy /start
      const welcomeMsg = `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n🏢 <b>"Uy Bozor" rasmiy botiga xush kelibsiz!</b>\n\nUshbu bot orqali:\n• Saytda tasdiqlash kodlarini olishingiz\n• To'g'ridan-to'g'ri yangi hisob ochishingiz mumkin.`;

      await sendMessage(token, chatId, welcomeMsg, {
        inline_keyboard: [
          [{ text: "📝 Botda ro'yxatdan o'tish", callback_data: "bot_reg_start" }],
          [
            { text: "🔑 Kod olish haqida", callback_data: "info_otp" },
            { text: "🌐 Saytga kirish", url: SITE_URL }
          ]
        ]
      });
      return;
    }

    // Sessiyani tekshirish
    let session = sessions.get(chatId);
    if (!session) {
      try {
        const { data } = await supabase.from('bot_reg_sessions').select('*').eq('chat_id', chatId).maybeSingle();
        if (data) {
          session = data;
          sessions.set(chatId, data);
        }
      } catch {}
    }

    if (session) {
      if (session.step === 'name') {
        if (!text || text.length < 2) {
          await sendMessage(token, chatId, '⚠️ Iltimos, ismingizni to\'liq kiriting (kamida 2 ta harf):');
          return;
        }

        session.name = text;
        session.step = 'phone';
        sessions.set(chatId, session);

        try {
          await supabase.from('bot_reg_sessions').upsert({
            chat_id: chatId,
            step: 'phone',
            name: text,
            updated_at: new Date().toISOString()
          });
        } catch {}

        await sendMessage(
          token,
          chatId,
          `Rahmat, <b>${text}</b>!\n\n📱 <b>Ro'yxatdan o'tish (2/3)</b>\n\nPastdagi <b>"📱 Raqamni ulashish"</b> tugmasini bosing yoki telefon raqamingizni <code>+998901234567</code> formatida yozing:`,
          {
            keyboard: [[{ text: '📱 Raqamni ulashish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        );
        return;
      }

      if (session.step === 'phone') {
        let rawPhone = '';
        if (msg.contact && msg.contact.phone_number) {
          rawPhone = msg.contact.phone_number;
        } else {
          rawPhone = text;
        }

        const cleanPhone = rawPhone.replace(/[^\d]/g, '');
        if (!cleanPhone || cleanPhone.length < 9) {
          await sendMessage(token, chatId, '⚠️ Iltimos, to\'g\'ri telefon raqam yuboring (masalan: <code>+998901234567</code>):');
          return;
        }

        // Avval ro'yxatdan o'tganmi?
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('telefon', cleanPhone)
            .maybeSingle();

          if (existingUser) {
            sessions.delete(chatId);
            try {
              await supabase.from('bot_reg_sessions').delete().eq('chat_id', chatId);
            } catch {}
            await sendMessage(
              token,
              chatId,
              `⚠️ <b>+${cleanPhone}</b> raqami allaqachon ro'yxatdan o'tgan!\n\nSaytga kirishingiz yoki parolni tiklashingiz mumkin:`,
              {
                remove_keyboard: true,
                inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: SITE_URL }]]
              }
            );
            return;
          }
        } catch {}

        session.phone = cleanPhone;
        session.step = 'password';
        sessions.set(chatId, session);

        try {
          await supabase.from('bot_reg_sessions').upsert({
            chat_id: chatId,
            step: 'password',
            name: session.name,
            phone: cleanPhone,
            updated_at: new Date().toISOString()
          });
        } catch {}

        await sendMessage(
          token,
          chatId,
          `📱 Raqamingiz qabul qilindi: <b>+${cleanPhone}</b>\n\n🔑 <b>Ro'yxatdan o'tish (3/3)</b>\n\nEndi hisobingiz uchun <b>parol</b> o'rnating (kamida 4 ta belgi):`,
          { remove_keyboard: true }
        );
        return;
      }

      if (session.step === 'password') {
        if (!text || text.length < 4) {
          await sendMessage(token, chatId, '⚠️ Parol kamida 4 ta belgidan iborat bo\'lishi kerak! Qaytadan kiriting:');
          return;
        }

        const passHash = bcrypt.hashSync(text, 10);
        const userId = 'user-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        try {
          const { error: insertError } = await supabase.from('users').insert([
            {
              id: userId,
              ism: session.name,
              telefon: session.phone,
              parol_hash: passHash,
              rol: 'foydalanuvchi',
              yaratilgan_sana: new Date().toISOString()
            }
          ]);

          if (insertError) {
            console.error('[User Bot] users insert error:', insertError);
          }

          await supabase.from('telegram_users').upsert({
            phone: session.phone,
            chat_id: chatId,
            first_name: session.name,
            username: username,
            updated_at: new Date().toISOString()
          });

          await supabase.from('bot_reg_sessions').delete().eq('chat_id', chatId);
        } catch (e) {
          console.error('[User Bot] registration error:', e.message);
        }

        console.log(`[User Bot] ✅ Successfully registered user: ${session.name} (+${session.phone})`);
        sessions.delete(chatId);

        const successMsg = `🎉 <b>Tabriklaymiz, ${session.name}!</b>\n\nSiz "Uy Bozor" tizimida muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n📱 <b>Telefoningiz:</b> <code>+${session.phone}</code>\n🔑 <b>Parolingiz:</b> <i>(o'rnatildi)</i>\n\nEndi saytga bemalol kirib, e'lonlar joylashtirishingiz va tizimdan to'liq foydalanishingiz mumkin!`;

        await sendMessage(token, chatId, successMsg, {
          inline_keyboard: [[{ text: "🏠 Saytga kirish", url: SITE_URL }]]
        });
        return;
      }
    }

    // Sessiya bo'lmasa, faol OTP kodni tekshirish
    try {
      const { data: tgUser } = await supabase
        .from('telegram_users')
        .select('phone')
        .eq('chat_id', chatId)
        .maybeSingle();

      if (tgUser?.phone) {
        const { data: otpData } = await supabase
          .from('otp_codes')
          .select('code, expires_at')
          .eq('phone', tgUser.phone)
          .maybeSingle();

        if (otpData && new Date(otpData.expires_at).getTime() > Date.now()) {
          const otpMsg = `🔐 <b>Sizning tasdiqlash kodingiz:</b>\n\n┌───────────────────┐\n  👉  <code>${otpData.code}</code>  👈\n└───────────────────┘\n\n⏳ <i>Ushbu 4 xonali kodni saytga kiriting.</i>`;
          await sendMessage(token, chatId, otpMsg);
          return;
        }
      }
    } catch {}

    // Standart javob
    await sendMessage(
      token,
      chatId,
      `Assalomu alaykum! Saytda ro'yxatdan o'tishda tasdiqlash kodi so'ralsa, kodingiz shu yerga yuboriladi.\n\nYangi hisob ochish uchun pastdagi tugmani bosing:`,
      {
        inline_keyboard: [
          [{ text: "📝 Botda ro'yxatdan o'tish", callback_data: "bot_reg_start" }],
          [{ text: "🌐 Saytga kirish", url: SITE_URL }]
        ]
      }
    );
  }
}

// ============================================================================
// 3. POLLING BO'TQUVCHI DASTUR (ADMIN & USER BOTS)
// ============================================================================
function startPollingBot(token, botLabel, updateHandler) {
  let offset = 0;

  async function poll() {
    try {
      const data = await tgRequest(token, 'getUpdates', {
        offset: offset + 1,
        timeout: 10
      });

      if (data && !data.ok) {
        console.warn(`[${botLabel}] Telegram API error:`, data.error_code, data.description);
      }

      if (data && data.ok && data.result && data.result.length > 0) {
        console.log(`[${botLabel}] 📥 Received ${data.result.length} update(s)`);
        for (const update of data.result) {
          offset = update.update_id;
          await updateHandler(token, update);
        }
      }
    } catch (err) {
      console.error(`[${botLabel}] Poll error:`, err.message);
    }

    setTimeout(poll, 1500);
  }

  poll();
}

// Botlarni ishga tushirish
if (ADMIN_BOT_TOKEN && USER_BOT_TOKEN && ADMIN_BOT_TOKEN === USER_BOT_TOKEN) {
  // Agar ikkala maqsad uchun yagona bot ishlatilsa
  console.log('[Bot Daemon] 🤖 Yagona bot rejimida ishga tushirildi (Admin + User)...');
  startPollingBot(ADMIN_BOT_TOKEN, 'Unified Bot', handleUserUpdate);
} else {
  // 1. Admin Boti (moderatsiya uchun)
  if (ADMIN_BOT_TOKEN) {
    console.log('[Bot Daemon] 👑 Admin Bot boshqaruvi ishga tushirildi...');
    startPollingBot(ADMIN_BOT_TOKEN, 'Admin Bot', async (token, update) => {
      if (update.callback_query) {
        await handleAdminCallbackQuery(token, update.callback_query);
      }
    });
  }

  // 2. Foydalanuvchi Boti (ro'yxatdan o'tish va kodlar uchun)
  if (USER_BOT_TOKEN) {
    console.log('[Bot Daemon] 📱 Foydalanuvchi Bot xizmati ishga tushirildi...');
    startPollingBot(USER_BOT_TOKEN, 'User Bot', handleUserUpdate);
  }
}
