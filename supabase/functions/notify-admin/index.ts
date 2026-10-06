// Supabase Edge Function: notify-admin
// Deno runtime - Server-side notification handler for Admin Telegram Bot

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { type, data } = payload;

    const botToken = Deno.env.get('BOT_TOKEN_ADMIN') || Deno.env.get('TELEGRAM_ADMIN_BOT_TOKEN') || '';
    const adminChatId = Deno.env.get('ADMIN_CHAT_ID') || '';
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.uybozor.store/';

    if (!botToken || !adminChatId) {
      console.error('[notify-admin] BOT_TOKEN_ADMIN yoki ADMIN_CHAT_ID sozlanmagan!');
      return new Response(
        JSON.stringify({ success: false, error: "Admin bot konfiguratsiyasi yetishmaydi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let text = '';
    let replyMarkup: any = null;

    if (type === 'new_listing') {
      const l = data;
      const narxStr = l.valyuta === 'USD' ? `$${Number(l.narx).toLocaleString()}` : `${Number(l.narx).toLocaleString()} so'm`;
      const turiStr = l.turi === 'sotuv' ? 'Sotuv' : 'Ijara';

      text = `🏢 <b>YANGI E'LON TUSHDI (Moderatsiya):</b>\n\n` +
        `🆔 <b>ID:</b> <code>${l.id}</code>\n` +
        `📋 <b>Turi:</b> ${turiStr}\n` +
        `📍 <b>Manzil:</b> ${l.shahar || ''}, ${l.manzil || ''}\n` +
        `💰 <b>Narx:</b> ${narxStr}\n` +
        `📱 <b>Aloqa:</b> <code>+${l.telefon}</code>\n` +
        (l.maydon ? `📐 <b>Maydon:</b> ${l.maydon} m²\n` : '') +
        (l.xonalar ? `🚪 <b>Xonalar:</b> ${l.xonalar} ta\n` : '') +
        (l.vipRequested ? `⭐ <b>VIP maqomi so'ralgan!</b>\n` : '') +
        `\n👇 <i>Ushbu e'lonni tasdiqlaysizmi?</i>`;

      replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash (Faol qilish)", callback_data: `approve_${l.id}` },
            { text: "❌ Rad etish", callback_data: `reject_${l.id}` }
          ],
          [
            { text: "⭐ VIP qilib tasdiqlash", callback_data: `approve_vip_${l.id}` },
            { text: "🔗 E'lonni ko'rish", url: `${siteUrl}elon/${l.id}` }
          ]
        ]
      };
    } else if (type === 'edit_request') {
      const l = data;
      text = `✏️ <b>E'LONNI TAHRIRLASH SO'ROVI:</b>\n\n` +
        `🆔 <b>E'lon ID:</b> <code>${l.id}</code>\n` +
        `📍 <b>Manzil:</b> ${l.shahar || ''}, ${l.manzil || ''}\n` +
        `📱 <b>Egasi:</b> <code>+${l.telefon}</code>\n\n` +
        `Foydalanuvchi ushbu e'lonini qayta tahrirlash uchun ruxsat so'ramoqda.\n` +
        `Ruxsat berasizmi?`;

      replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Ruxsat berish (1 marta)", callback_data: `allow_edit_${l.id}` },
            { text: "❌ Rad etish", callback_data: `deny_edit_${l.id}` }
          ],
          [
            { text: "🔗 E'lonni ko'rish", url: `${siteUrl}elon/${l.id}` }
          ]
        ]
      };
    } else if (type === 'vip_request') {
      const l = data;
      text = `⭐ <b>VIP MAQOM SO'ROVI:</b>\n\n` +
        `🆔 <b>E'lon ID:</b> <code>${l.id}</code>\n` +
        `📍 <b>Manzil:</b> ${l.shahar || ''}, ${l.manzil || ''}\n` +
        `📱 <b>Aloqa:</b> <code>+${l.telefon}</code>\n\n` +
        `Foydalanuvchi e'lonini VIP ro'yxatiga qo'shishni so'ramoqda.`;

      replyMarkup = {
        inline_keyboard: [
          [
            { text: "⭐ VIP qilib tasdiqlash", callback_data: `approve_vip_${l.id}` },
            { text: "❌ Rad etish", callback_data: `reject_vip_${l.id}` }
          ]
        ]
      };
    } else if (type === 'admin_login_2fa') {
      const reqInfo = data;
      text = `🔐 <b>ADMIN PANELGA KIRISH SO'ROVI (2FA):</b>\n\n` +
        `👤 <b>Admin:</b> ${reqInfo.userName || 'Administrator'}\n` +
        `📱 <b>Telefon/Login:</b> <code>${reqInfo.userPhone || ''}</code>\n` +
        `🆔 <b>So'rov ID:</b> <code>${reqInfo.id}</code>\n` +
        `⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString('uz-UZ')}\n\n` +
        `Siz yoki boshqa kimdir Admin boshqaruv paneliga kirishga urinmoqda. Ruxsat berasizmi?`;

      replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Ruxsat berish", callback_data: `approve_login_${reqInfo.id}` },
            { text: "⛔ Rad etish", callback_data: `reject_login_${reqInfo.id}` }
          ]
        ]
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Noma'lum xabarnoma turi" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('[notify-admin] tg error:', tgData);
      return new Response(
        JSON.stringify({ success: false, error: tgData.description }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: tgData.result?.message_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[notify-admin] Server error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Server xatosi" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
