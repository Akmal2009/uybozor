// Supabase Edge Function: admin-auth
// Deno runtime - 100% server-side authentication & 2FA management using Service Role Key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { action, login, password, requestId, userId, userName, userPhone, status } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Yangi 2FA login so'rovini yaratish
    if (action === 'create_2fa') {
      const newId = 'req-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const { error: insErr } = await supabase.from('login_requests').insert([
        {
          id: newId,
          status: 'kutilmoqda',
          user_id: userId,
          user_name: userName,
          user_phone: userPhone,
          created_at: new Date().toISOString()
        }
      ]);

      if (insErr) {
        return new Response(
          JSON.stringify({ success: false, error: insErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id: newId, status: 'kutilmoqda' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 2FA login so'rovi holatini tekshirish
    if (action === 'check_2fa') {
      if (!requestId) {
        return new Response(
          JSON.stringify({ success: false, error: "requestId kiritilmadi" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('login_requests')
        .select('status, created_at')
        .eq('id', requestId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, status: 'kutilmoqda' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, status: data.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2.1. Foydalanuvchi parolini xavfsiz tiklash (OTP tasdiqlangandan so'ng)
    if (action === 'reset_user_password') {
      const cleanPhone = ((payload.phone as string) || '').replace(/[^\d]/g, '');
      const newPassword = ((payload.new_password as string) || '').trim();

      if (!cleanPhone || cleanPhone.length < 9) {
        return new Response(
          JSON.stringify({ success: false, error: "Noto'g'ri telefon raqam" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!newPassword || newPassword.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: "Parol kamida 8 ta belgidan iborat bo'lishi shart" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authEmail = `${cleanPhone}@phone.uybozor.uz`;
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const targetUser = usersList?.users?.find(u => u.email === authEmail || u.phone === cleanPhone);

      if (targetUser) {
        const { error: updErr } = await supabase.auth.admin.updateUserById(targetUser.id, {
          password: newPassword
        });
        if (updErr) {
          return new Response(
            JSON.stringify({ success: false, error: updErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        await supabase.auth.admin.createUser({
          email: authEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { telefon: cleanPhone }
        });
      }

      try {
        const passHash = await bcrypt.hash(newPassword);
        await supabase.from('users').update({ parol_hash: passHash }).eq('telefon', cleanPhone);
      } catch {}

      return new Response(
        JSON.stringify({ success: true, message: "Parol muvaffaqiyatli yangilandi" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2.2. Foydalanuvchi zaxira kirishi (Bot orqali ro'yxatdan o'tgan yoki eski parollarni JIT sinxronlash)
    if (action === 'user_fallback_login') {
      const cleanPhone = ((payload.phone as string) || '').replace(/[^\d]/g, '');
      const inputPass = ((payload.password as string) || '').trim();

      if (!cleanPhone || cleanPhone.length < 9 || !inputPass) {
        return new Response(
          JSON.stringify({ success: false, error: "Ma'lumotlar to'liq emas" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const p9 = cleanPhone.length === 12 && cleanPhone.startsWith('998') ? cleanPhone.slice(3) : cleanPhone;
      const p12 = cleanPhone.length === 9 ? '998' + cleanPhone : cleanPhone;

      // 1. users jadvalidan tekshirish
      let userRow: any = null;
      const { data: u1 } = await supabase.from('users').select('*').eq('telefon', p12).maybeSingle();
      userRow = u1;
      if (!userRow) {
        const { data: u2 } = await supabase.from('users').select('*').eq('telefon', p9).maybeSingle();
        userRow = u2;
      }

      if (!userRow || !userRow.parol_hash) {
        return new Response(
          JSON.stringify({ success: false, error: "Foydalanuvchi topilmadi" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Bcrypt parolni tekshirish
      const isMatch = await bcrypt.compare(inputPass, userRow.parol_hash);
      if (!isMatch) {
        return new Response(
          JSON.stringify({ success: false, error: "Parol noto'g'ri" }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Parol to'g'ri! Supabase Auth'ga sinxronlash
      const authEmail = `${p12}@phone.uybozor.uz`;
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existingAuth = usersList?.users?.find(u => u.email === authEmail || u.phone === p12 || u.phone === p9);

      if (existingAuth) {
        await supabase.auth.admin.updateUserById(existingAuth.id, {
          password: inputPass
        });
      } else {
        const { data: newAuth } = await supabase.auth.admin.createUser({
          email: authEmail,
          password: inputPass,
          email_confirm: true,
          user_metadata: { ism: userRow.ism, telefon: p12 }
        });
        if (newAuth?.user) {
          await supabase.from('profiles').upsert({
            id: newAuth.user.id,
            ism: userRow.ism,
            telefon: p12,
            email: authEmail,
            is_admin: Boolean(userRow.is_admin),
            is_blocked: Boolean(userRow.is_blocked)
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, email: authEmail }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Admin ma'lumotlarini tekshirish (Standart yoki action='verify')
    const cleanLogin = (login || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanLogin || !cleanPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Login va parolni kiriting" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // A. PostgreSQL RPC (admin_verify_credentials) orqali tekshirish
    try {
      const { data: rpcSuccess } = await supabase.rpc('admin_verify_credentials', {
        p_login: cleanLogin,
        p_password: cleanPassword
      });

      if (rpcSuccess === true) {
        return new Response(
          JSON.stringify({
            success: true,
            adminInfo: { name: 'Bosh Administrator', phone: cleanLogin }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {}

    // B. profiles / users jadvalidan is_admin foydalanuvchini tekshirish
    const cleanDigits = cleanLogin.replace(/[^\d]/g, '');

    // Query injection xavfsizligi: alohida parametrlangan so'rovlar
    let userRow: any = null;

    if (cleanDigits.length >= 9) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('telefon', cleanDigits)
        .eq('is_admin', true)
        .maybeSingle();
      userRow = data;
    }

    if (!userRow) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanLogin)
        .eq('is_admin', true)
        .maybeSingle();
      userRow = data;
    }

    // Agar eski users jadvalida qolgan bo'lsa
    if (!userRow) {
      if (cleanDigits.length >= 9) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('is_admin', true)
          .eq('telefon', cleanDigits)
          .maybeSingle();
        userRow = data;
      }
      if (!userRow) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('is_admin', true)
          .eq('email', cleanLogin)
          .maybeSingle();
        userRow = data;
      }
    }

    if (userRow) {
      // Supabase Auth orqali tekshirish
      const authEmail = userRow.email || `${cleanDigits || userRow.telefon}@phone.uybozor.uz`;
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: cleanPassword
      });

      if (!authErr && authData?.user) {
        return new Response(
          JSON.stringify({
            success: true,
            adminInfo: {
              name: userRow.ism || 'Administrator',
              phone: userRow.telefon || cleanLogin
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Bcrypt hash solishtirish (agar parol_hash bo'lsa)
      if (userRow.parol_hash) {
        const isMatch = await bcrypt.compare(cleanPassword, userRow.parol_hash);
        if (isMatch) {
          return new Response(
            JSON.stringify({
              success: true,
              adminInfo: {
                name: userRow.ism || 'Administrator',
                phone: userRow.telefon || cleanLogin
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // C. Server Secrets (ADMIN_LOGIN va ADMIN_PASSWORD_HASH)
    const envLogin = (Deno.env.get('ADMIN_LOGIN') || '').trim().toLowerCase();
    const envHash = Deno.env.get('ADMIN_PASSWORD_HASH');

    if (envLogin && envHash && cleanLogin === envLogin) {
      const matches = await bcrypt.compare(cleanPassword, envHash);
      if (matches) {
        return new Response(
          JSON.stringify({
            success: true,
            adminInfo: { name: 'Bosh Administrator', phone: cleanLogin }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Login yoki parol noto'g'ri kiritildi" }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[admin-auth] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Server xatosi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
