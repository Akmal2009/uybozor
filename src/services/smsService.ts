// ============================================================================
// 📱 TASDIQLASH KODI XIZMATI (SMS O'RNIGA TELEGRAM BOT ORQALI YUBORILADI)
// ============================================================================
import { sendTelegramOtpCode, verifyTelegramOtpCode } from './telegramService';

export interface SmsSendResult {
  success: boolean;
  code: string;
  messageId?: string;
  error?: string;
}

/**
 * 1. 4 xonali tasdiqlash kodini Telegram bot orqali yuborish (Eski sendSmsOtpCode chaqiruvlari uchun)
 */
export const sendSmsOtpCode = async (
  phone: string,
  purpose: string = 'Ro\'yxatdan o\'tish'
): Promise<SmsSendResult> => {
  const result = await sendTelegramOtpCode(phone, purpose);
  return {
    success: result.success,
    code: result.code,
    error: result.error
  };
};

/**
 * 2. Kiritilgan tasdiqlash kodini tekshirish
 */
export const verifySmsOtpCode = async (phone: string, inputCode: string): Promise<boolean> => {
  return await verifyTelegramOtpCode(phone, inputCode);
};
