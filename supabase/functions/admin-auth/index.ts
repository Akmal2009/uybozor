// Supabase Edge Function: admin-auth
// Deno runtime - 100% server-side authentication using bcrypt / database RPC

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { login, password } = await req.json();

    const cleanLogin = (login || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanLogin || !cleanPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Login va parolni kiriting" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedLogin = (Deno.env.get('ADMIN_LOGIN') || 'uyborakmal').trim().toLowerCase();
    if (cleanLogin !== expectedLogin) {
      return new Response(
        JSON.stringify({ success: false, error: "Login yoki parol noto'g'ri kiritildi" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Supabase PostgreSQL RPC orqali tekshirish (admin_verify_credentials)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: rpcSuccess, error: rpcErr } = await supabase.rpc('admin_verify_credentials', {
          p_login: cleanLogin,
          p_password: cleanPassword
        });

        if (!rpcErr && typeof rpcSuccess === 'boolean') {
          if (rpcSuccess === true) {
            return new Response(
              JSON.stringify({ success: true, message: 'Administrator tasdiqlandi' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            return new Response(
              JSON.stringify({ success: false, error: "Login yoki parol noto'g'ri kiritildi" }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (err) {
        console.warn('RPC check in Edge Function error:', err);
      }
    }

    // 2. Agar Edge Function env da ADMIN_PASSWORD_HASH (bcrypt) berilgan bo'lsa
    const envBcryptHash = Deno.env.get('ADMIN_PASSWORD_HASH');
    if (envBcryptHash) {
      try {
        const matches = await bcrypt.compare(cleanPassword, envBcryptHash);
        if (matches) {
          return new Response(
            JSON.stringify({ success: true, message: 'Administrator tasdiqlandi' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.warn('Bcrypt compare error:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Login yoki parol noto'g'ri kiritildi" }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Server xatoligi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
