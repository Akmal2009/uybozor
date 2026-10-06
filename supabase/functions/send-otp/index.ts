// Supabase Edge Function: send-otp
// Deno runtime - 100% server-side cryptographically secure OTP generation & delivery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    const cleanPhone = (phone || '').replace(/[^\d]/g, '');

    if (!cleanPhone || cleanPhone.length < 9) {
      return new Response(
        JSON.stringify({ success: false, error: "To'g'ri telefon raqam kiriting" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const botToken = Deno.env.get('BOT_TOKEN_USER') || Deno.env.get('TELEGRAM_USER_BOT_TOKEN') || '';
    const botUsername = Deno.env.get('BOT_USERNAME_USER') || Deno.env.get('TELEGRAM_USER_BOT_USERNAME') || 'uybozorcodebot';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-otp] Supabase Service Role Key o\'rnatilmagan!');
      return new Response(
        JSON.stringify({ success: false, error: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Foydalanuvchining bloklanganligini tekshirish (5 marta xato kiritgan bo'lsa 15 min blok)
    const { data: existingOtp } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    const now = new Date();
    if (existingOtp?.blocked_until && new Date(existingOtp.blocked_until) > now) {
      const waitMin = Math.ceil((new Date(existingOtp.blocked_until).getTime() - now.getTime()) / 60000);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Juda ko'p xato urinishlar! Iltimos, ${waitMin} daqiqadan so'ng qayta urinib ko'ring.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Telegram chat ID sini tekshirish
    const { data: tgUser } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!tgUser || !tgUser.chat_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "telegram_not_linked",
          message: "Ushbu telefon raqamga Telegram bot bog'lanmagan. Iltimos, avval Telegram botimizga /start bosing.",
          bot_username: botUsername,
          bot_url: `https://t.me/${botUsername.replace('@', '')}?start=${cleanPhone}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Kriptografik 6 xonali tasdiqlash kodini yaratish (crypto.getRandomValues)
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const otpCode = String(100000 + (randomBuffer[0] % 900000));

    // Kodni SHA-256 bilan xeshlash (Bazada ochiq kod saqlanmaydi!)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otpCode));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 daqiqa

    // 4. Bazaga xeshlangan holda saqlash
    const { error: dbError } = await supabase
      .from('otp_codes')
      .upsert({
        phone: cleanPhone,
        code_hash: hashHex,
        expires_at: expiresAt,
        attempts: 0,
        blocked_until: null,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('[send-otp] DB upsert error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: "Tasdiqlash kodini yaratishda xatolik yuz berdi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Telegram foydalanuvchisiga yuborish (Server-side)
    if (!botToken) {
      console.error('[send-otp] BOT_TOKEN_USER topilmadi!');
      return new Response(
        JSON.stringify({ success: false, error: "Telegram bot tokeni sozlanmagan" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageText = `🔐 <b>"Uy Bozor" Tasdiqlash Kodi:</b>\n\n┌───────────────────┐\n  👉  <code>${otpCode}</code>  👈\n└───────────────────┘\n<i>(Nusxalash uchun kod ustiga bosing)</i>\n\n📱 <b>Telefon:</b> <code>+${cleanPhone}</code>\n⏳ <i>Kod 5 daqiqa davomida amal qiladi. Hech kimga bermang!</i>`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tgUser.chat_id,
        text: messageText,
        parse_mode: 'HTML'
      })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('[send-otp] Telegram sendMessage error:', tgData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Telegram orqali xabar yuborib bo'lmadi. Botni qayta ishga tushiring: /start",
          bot_url: `https://t.me/${botUsername.replace('@', '')}?start=${cleanPhone}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // XAVFSIZLIK: Mijozga hech qachon 'code' qaytarilmaydi!
    return new Response(
      JSON.stringify({
        success: true,
        message: "Tasdiqlash kodi Telegram botingizga yuborildi."
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[send-otp] Server error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Server xatosi" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
