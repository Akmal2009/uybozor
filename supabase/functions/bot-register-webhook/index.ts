// Supabase Edge Function: bot-register-webhook
// Deno runtime - Telegram webhook handler for @uybozorcodebot

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const BOT_TOKEN = Deno.env.get("TELEGRAM_USER_BOT_TOKEN") || "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://uy-bozor.uz";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Telegramga xabar yuborish yordamchisi
async function sendMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: any
) {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_USER_BOT_TOKEN o'rnatilmagan!");
    return;
  }

  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Telegram sendMessage xatosi:", err);
  }
}

// Inline Callback savoliga javob qaytarish
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "",
      }),
    });
  } catch (e) {
    console.error("answerCallbackQuery xatosi:", e);
  }
}

// Oddiy parolni xeshlash (Base64 / SHA-256 fallback)
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const update = await req.json();

    // 1. Callback query (inline tugmalar)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id?.toString() || cb.from?.id?.toString();
      const data = cb.data || "";

      await answerCallbackQuery(cb.id);

      if (data === "bot_reg_start") {
        // Ro'yxatdan o'tishni boshlash
        await supabase.from("bot_reg_sessions").upsert({
          chat_id: chatId,
          step: "name",
          updated_at: new Date().toISOString(),
        });

        await sendMessage(
          chatId,
          `📝 <b>Ro'yxatdan o'tish</b>\n\nIltimos, to'liq <b>ism va familiyangizni</b> kiriting:`
        );
      } else if (data === "info_otp") {
        await sendMessage(
          chatId,
          `🔑 <b>Tasdiqlash kodi xizmati</b>\n\nSaytda ro'yxatdan o'tish yoki parolni tiklash jarayonida telefon raqamingizni kiritib <b>"Telegramdan kod olish"</b> tugmasini bossangiz, 4 xonali bir martalik maxfiy kod aynan shu yerga yuboriladi.`
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 2. Oddiy xabarlar (Message)
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id.toString();
      const text = (msg.text || "").trim();
      const firstName = msg.from?.first_name || "Foydalanuvchi";
      const username = msg.from?.username || null;

      // /start buyrug'i
      if (text.startsWith("/start")) {
        const parts = text.split(/\s+/);
        const payloadRaw = parts.length > 1 ? parts[1].trim() : "";
        const payloadPhone = payloadRaw.replace(/[^\d]/g, "");

        if (payloadRaw === "register") {
          await supabase.from("bot_reg_sessions").upsert({
            chat_id: chatId,
            step: "name",
            updated_at: new Date().toISOString(),
          });

          await sendMessage(
            chatId,
            `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n🏢 <b>"Uy Bozor" tizimida ro'yxatdan o'tish (1/3)</b>\n\nIltimos, to'liq <b>ism va familiyangizni</b> kiriting (masalan: <i>Ali Valiyev</i>):`
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (payloadPhone) {
          // Saytdan start parametr bilan kelgan telefon raqam
          await supabase.from("telegram_users").upsert({
            phone: payloadPhone,
            chat_id: chatId,
            first_name: firstName,
            username: username,
            updated_at: new Date().toISOString(),
          });

          // Ushbu telefon uchun faol OTP bormi?
          const { data: otpData } = await supabase
            .from("otp_codes")
            .select("code, expires_at")
            .eq("phone", payloadPhone)
            .maybeSingle();

          if (otpData && new Date(otpData.expires_at).getTime() > Date.now()) {
            const otpMsg = `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n🏢 <b>"Uy Bozor" Tasdiqlash Kodi:</b>\n\n┌───────────────────┐\n  👉  <code>${otpData.code}</code>  👈\n└───────────────────┘\n<i>(Nusxalash uchun kod ustiga bosing)</i>\n\n📱 <b>Telefon:</b> <code>+${payloadPhone}</code>\n⏳ <i>Kod 5 daqiqa davomida amal qiladi. Saytga ushbu kodni kiriting.</i>`;

            await sendMessage(chatId, otpMsg, {
              inline_keyboard: [
                [{ text: "🌐 Saytga o'tish", url: SITE_URL }],
              ],
            });
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
        }

        // Oddiy /start yoki OTP topilmagan holat
        const welcomeText = `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n🏢 <b>"Uy Bozor" rasmiy botiga xush kelibsiz!</b>\n\nBu bot orqali siz:\n• Saytda tasdiqlash kodlarini olishingiz\n• To'g'ridan-to'g'ri hisob yaratishingiz mumkin.`;

        await sendMessage(chatId, welcomeText, {
          inline_keyboard: [
            [
              { text: "📝 Ro'yxatdan o'tish", callback_data: "bot_reg_start" },
            ],
            [
              { text: "🔑 Kod olish haqida", callback_data: "info_otp" },
              { text: "🌐 Saytga kirish", url: SITE_URL },
            ],
          ],
        });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Sessiyani tekshirish (Foydalanuvchi ro'yxatdan o'tish bosqichidami?)
      const { data: session } = await supabase
        .from("bot_reg_sessions")
        .select("*")
        .eq("chat_id", chatId)
        .maybeSingle();

      if (session) {
        if (session.step === "name") {
          // Ismni qabul qilish
          if (!text || text.length < 2) {
            await sendMessage(
              chatId,
              "⚠️ Iltimos, ismingizni to'liq kiriting (kamida 2 ta harf):"
            );
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }

          await supabase
            .from("bot_reg_sessions")
            .update({
              name: text,
              step: "phone",
              updated_at: new Date().toISOString(),
            })
            .eq("chat_id", chatId);

          // Telefon so'rash (Contact tugmasi bilan)
          await sendMessage(
            chatId,
            `Rahmat, <b>${text}</b>!\n\nEndi telefon raqamingizni yuboring:\nPastdagi <b>"📱 Raqamni ulashish"</b> tugmasini bosing yoki <code>+998901234567</code> formatida yozing:`,
            {
              keyboard: [
                [{ text: "📱 Raqamni ulashish", request_contact: true }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            }
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (session.step === "phone") {
          // Telefon raqamni qabul qilish
          let rawPhone = "";
          if (msg.contact && msg.contact.phone_number) {
            rawPhone = msg.contact.phone_number;
          } else {
            rawPhone = text;
          }

          const cleanPhone = rawPhone.replace(/[^\d]/g, "");
          if (!cleanPhone || cleanPhone.length < 9) {
            await sendMessage(
              chatId,
              "⚠️ Iltimos, to'g'ri telefon raqam yuboring (masalan: <code>+998901234567</code>):"
            );
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }

          // Foydalanuvchi avval ro'yxatdan o'tganmi?
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("telefon", cleanPhone)
            .maybeSingle();

          if (existingUser) {
            await supabase
              .from("bot_reg_sessions")
              .delete()
              .eq("chat_id", chatId);

            await sendMessage(
              chatId,
              `⚠️ <b>+${cleanPhone}</b> raqami allaqachon ro'yxatdan o'tgan!\n\nSaytga kirishingiz yoki parolingizni tiklashingiz mumkin:`,
              {
                remove_keyboard: true,
                inline_keyboard: [
                  [{ text: "🌐 Saytga o'tish", url: SITE_URL }],
                ],
              }
            );
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }

          await supabase
            .from("bot_reg_sessions")
            .update({
              phone: cleanPhone,
              step: "password",
              updated_at: new Date().toISOString(),
            })
            .eq("chat_id", chatId);

          await sendMessage(
            chatId,
            `📱 Telefon raqam qabul qilindi: <b>+${cleanPhone}</b>\n\nEndi hisobingiz uchun <b>parol</b> o'rnating (kamida 4 ta belgi):`,
            {
              remove_keyboard: true,
            }
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (session.step === "password") {
          if (!text || text.length < 4) {
            await sendMessage(
              chatId,
              "⚠️ Parol kamida 4 ta belgidan iborat bo'lishi kerak! Qaytadan kiriting:"
            );
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }

          const passHash = await hashPassword(text);
          const userId = "user-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

          // 1. users jadvaliga yangi foydalanuvchini qo'shish
          const { error: insertError } = await supabase.from("users").insert([
            {
              id: userId,
              ism: session.name,
              telefon: session.phone,
              parol_hash: passHash,
              rol: "foydalanuvchi",
              yaratilgan_sana: new Date().toISOString(),
            },
          ]);

          if (insertError) {
            console.error("users insert error:", insertError);
            await sendMessage(
              chatId,
              "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
            );
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }

          // 2. telegram_users jadvalini bog'lash
          await supabase.from("telegram_users").upsert({
            phone: session.phone,
            chat_id: chatId,
            first_name: session.name,
            username: username,
            updated_at: new Date().toISOString(),
          });

          // 3. Sessiyani tozalash
          await supabase
            .from("bot_reg_sessions")
            .delete()
            .eq("chat_id", chatId);

          const successMsg = `🎉 <b>Tabriklaymiz, ${session.name}!</b>\n\nSiz "Uy Bozor" tizimida muvaffaqiyatli ro'yxatdan o'tdingiz.\n\n📱 <b>Telefoningiz:</b> <code>+${session.phone}</code>\n🔑 <b>Parolingiz:</b> <i>(o'rnatildi)</i>\n\nEndi saytga bemalol kirib, e'lonlar joylashtirishingiz mumkin!`;

          await sendMessage(chatId, successMsg, {
            inline_keyboard: [
              [{ text: "🏠 Saytga kirish", url: SITE_URL }],
            ],
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
      }

      // Agar sessiya bo'lmasa va foydalanuvchi ixtiyoriy matn yozsa:
      // Avval bog'langan telefon bo'yicha faol OTP bormi-yo'qligini tekshiramiz
      const { data: tgUser } = await supabase
        .from("telegram_users")
        .select("phone")
        .eq("chat_id", chatId)
        .maybeSingle();

      if (tgUser?.phone) {
        const { data: otpData } = await supabase
          .from("otp_codes")
          .select("code, expires_at")
          .eq("phone", tgUser.phone)
          .maybeSingle();

        if (otpData && new Date(otpData.expires_at).getTime() > Date.now()) {
          const otpMsg = `🔐 <b>Sizning tasdiqlash kodingiz:</b>\n\n👉 <code>${otpData.code}</code> 👈\n\n⏳ <i>Saytdagi tasdiqlash oynasiga aynan shu kodni kiriting.</i>`;
          await sendMessage(chatId, otpMsg);
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
      }

      await sendMessage(
        chatId,
        `Assalomu alaykum! Saytda ro'yxatdan o'tishda tasdiqlash kodi so'ralsa, kodingiz shu yerga yuboriladi. Yangi hisob yaratish uchun pastdagi tugmani bosing:`,
        {
          inline_keyboard: [
            [
              { text: "📝 Ro'yxatdan o'tish", callback_data: "bot_reg_start" },
              { text: "🌐 Saytga kirish", url: SITE_URL },
            ],
          ],
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
