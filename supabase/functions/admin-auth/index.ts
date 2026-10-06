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
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('is_admin', true)
        .or(`email.eq.${cleanLogin},telefon.eq.${cleanDigits || cleanLogin}`)
        .maybeSingle();
      userRow = data;
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
