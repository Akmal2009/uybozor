// Supabase Edge Function: verify-otp
// Deno runtime - 100% server-side OTP code verification with rate limiting & brute-force defense

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
    const body = await req.json();
    const { action, phone, code, token } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 0. Bir martalik xavfsiz avtologin tokenini almashtirish
    if (action === 'exchange_token' && token) {
      const cleanToken = String(token).trim();
      const tokenKey = cleanToken.startsWith('at_') ? 'token_' + cleanToken : cleanToken;
      const { data: tokData } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', tokenKey)
        .maybeSingle();

      if (tokData && new Date(tokData.expires_at) > new Date()) {
        await supabase.from('otp_codes').delete().eq('phone', tokenKey);
        const userRef = tokData.code || '';
        const cleanP = userRef.replace(/[^\d]/g, '');
        const email = `${cleanP}@phone.uybozor.uz`;

        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email
        });

        if (!linkErr && linkData?.properties?.action_link) {
          return new Response(
            JSON.stringify({
              success: true,
              magic_link: linkData.properties.action_link
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: "Token yaroqsiz yoki muddati o'tgan" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPhone = (phone || '').replace(/[^\d]/g, '');
    const cleanCode = (code || '').trim();

    if (!cleanPhone || cleanPhone.length < 9) {
      return new Response(
        JSON.stringify({ success: false, error: "Telefon raqami noto'g'ri" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cleanCode || cleanCode.length < 4) {
      return new Response(
        JSON.stringify({ success: false, error: "Tasdiqlash kodini to'liq kiriting" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Bazadan OTP yozuvini olish
    const { data: record, error: dbError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (dbError || !record) {
      return new Response(
        JSON.stringify({ success: false, error: "Tasdiqlash kodi topilmadi yoki muddati o'tgan. Iltimos, yangi kod so'rang." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();

    // 2. Bloklanganlikni tekshirish
    if (record.blocked_until && new Date(record.blocked_until) > now) {
      const waitMin = Math.ceil((new Date(record.blocked_until).getTime() - now.getTime()) / 60000);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Ko'p xato urinishlar sababli hisob vaqtincha bloklangan. Iltimos, ${waitMin} daqiqadan so'ng qayta urinib ko'ring.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Kod muddatini tekshirish (5 daqiqa)
    if (new Date(record.expires_at) < now) {
      await supabase.from('otp_codes').delete().eq('phone', cleanPhone);
      return new Response(
        JSON.stringify({ success: false, error: "Kodning amal qilish muddati tugagan (5 daqiqa). Qaytadan kod so'rang." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Kiritilgan kodni SHA-256 xeshlash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(cleanCode));
    const inputHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Moslikni tekshirish (yoki legacy oddiy kod saqlangan bo'lsa)
    const isMatch = (record.code_hash && record.code_hash === inputHash) ||
                    (record.code && record.code === cleanCode);

    if (isMatch) {
      // Muvaffaqiyatli: kodni bir martalik qilib bazadan o'chirish
      await supabase.from('otp_codes').delete().eq('phone', cleanPhone);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Kod muvaffaqiyatli tasdiqlandi"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Noto'g'ri kod: urinishlar sonini oshirish
    const currentAttempts = (record.attempts || 0) + 1;
    const isNowBlocked = currentAttempts >= 5;
    const blockedUntil = isNowBlocked
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;

    await supabase
      .from('otp_codes')
      .update({
        attempts: currentAttempts,
        blocked_until: blockedUntil
      })
      .eq('phone', cleanPhone);

    if (isNowBlocked) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "5 marta noto'g'ri kod kiritildi! Xavfsizlik yuzasidan 15 daqiqaga bloklandingiz."
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Noto'g'ri kod! Qolgan urinishlar soni: ${5 - currentAttempts}`,
        remainingAttempts: 5 - currentAttempts
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[verify-otp] Server error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Server xatosi" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
