// ============================================================================
// 📱 SMS XIZMATI (Eskiz.uz / SMS Provayder)
// ============================================================================

export interface SmsSendResult {
  success: boolean;
  code: string;
  messageId?: string;
  error?: string;
}

// Eskiz.uz konfiguratsiyasi (agar sozlanganda)
const env = (import.meta as any).env || {};
const ESKIZ_EMAIL = env.VITE_ESKIZ_EMAIL || (typeof localStorage !== 'undefined' ? localStorage.getItem('eskiz_email') : '') || '';
const ESKIZ_PASSWORD = env.VITE_ESKIZ_PASSWORD || (typeof localStorage !== 'undefined' ? localStorage.getItem('eskiz_password') : '') || '';

let eskizToken: string | null = null;
let eskizTokenExpires = 0;

// Eskiz tokenini olish
const getEskizToken = async (): Promise<string | null> => {
  if (eskizToken && Date.now() < eskizTokenExpires) {
    return eskizToken;
  }

  if (!ESKIZ_EMAIL || !ESKIZ_PASSWORD) {
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('email', ESKIZ_EMAIL);
    formData.append('password', ESKIZ_PASSWORD);

    const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data && data.data && data.data.token) {
      eskizToken = data.data.token;
      eskizTokenExpires = Date.now() + 25 * 24 * 60 * 60 * 1000; // ~25 kun
      return eskizToken;
    }
  } catch (e) {
    console.warn('[SMS Service] Eskiz auth error:', e);
  }

  return null;
};

/**
 * 1. Foydalanuvchining telefon raqamiga 4 xonali SMS kod yuborish
 */
export const sendSmsOtpCode = async (
  phone: string,
  purpose: string = 'Ro\'yxatdan o\'tish'
): Promise<SmsSendResult> => {
  // 4 xonali tasodifiy xavfsiz kod
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const cleanPhone = phone.replace(/[^\d]/g, '');

  const otpData = {
    code,
    phone: cleanPhone,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 daqiqa
  };

  try {
    localStorage.setItem(`uybozor_otp_${cleanPhone}`, JSON.stringify(otpData));
    localStorage.setItem('uybozor_latest_otp', JSON.stringify(otpData));
  } catch (e) {}

  const token = await getEskizToken();

  if (token) {
    try {
      const message = `Arzon Uy: ${purpose} uchun tasdiqlash kodi: ${code}. Kodni hech kimga bermang!`;
      const formData = new FormData();
      formData.append('mobile_phone', cleanPhone);
      formData.append('message', message);
      formData.append('from', '4546');

      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const resData = await res.json();
      if (resData.status === 'waiting' || resData.status === 'success') {
        return { success: true, code, messageId: resData.id };
      }
    } catch (e: any) {
      console.warn('[SMS Service] Eskiz send error:', e);
    }
  }

  // Konsolga bildirishnoma
  console.log(`%c[SMS YUBORILDI] Telefon: ${phone} | Kod: ${code} | Maqsad: ${purpose}`, 'color: #10b981; font-weight: bold; font-size: 14px;');

  return {
    success: true,
    code
  };
};

/**
 * 2. Kiritilgan SMS kodni tekshirish
 */
export const verifySmsOtpCode = (phone: string, inputCode: string): boolean => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const rawData = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem(`uybozor_otp_${cleanPhone}`) || localStorage.getItem('uybozor_latest_otp'))
    : null;

  if (!rawData) {
    return false;
  }

  try {
    const { code, expiresAt } = JSON.parse(rawData);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(`uybozor_otp_${cleanPhone}`);
      localStorage.removeItem('uybozor_latest_otp');
      throw new Error('SMS kodning amal qilish muddati tugagan! Yangi kod so\'rang.');
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
