import { Payment, PaymentProvider } from '../types';
import { updateListing } from './listingService';
import { getSupabase } from './supabase';

const PAYMENTS_STORAGE_KEY = 'uybozor_payments';

export const getStoredPayments = (): Payment[] => {
  const data = localStorage.getItem(PAYMENTS_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveStoredPayments = (payments: Payment[]) => {
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
};

// VIP xizmati narxlari (UZS)
export const VIP_PRICING = {
  VIP_7_DAYS: { days: 7, summa: 49000, name: '7 kunlik VIP e\'lon' },
  VIP_30_DAYS: { days: 30, summa: 149000, name: '30 kunlik VIP e\'lon' },
  TOP_PIN: { days: 3, summa: 29000, name: 'TOP 3 kunlik mahkamlash' }
};

// Payme va Click to'lov havolalarini yaratish
export const generatePaymentLink = (provider: PaymentProvider, amount: number, paymentId: string, listingTitle: string) => {
  if (provider === 'Payme') {
    // Payme Checkout URL formati: https://checkout.paycom.uz/base64(m=merchant_id;ac.order_id=...;a=amount_in_tiyin)
    const base64Data = btoa(`m=64a0000000000000;ac.order_id=${paymentId};a=${amount * 100}`);
    return `https://checkout.paycom.uz/${base64Data}`;
  } else if (provider === 'Click') {
    // Click Checkout URL: https://my.click.uz/services/pay?service_id=...&merchant_id=...&amount=...&transaction_param=...
    return `https://my.click.uz/services/pay?service_id=12345&merchant_id=67890&amount=${amount}&transaction_param=${paymentId}&return_url=${encodeURIComponent(window.location.origin)}`;
  }
  return '#';
};

// To'lovni yaratish va qayta ishlash
export const processListingPayment = async (
  userId: string,
  listingId: string,
  summa: number,
  provider: PaymentProvider,
  listingTitle?: string
): Promise<Payment> => {
  const paymentId = 'pay-' + Date.now();
  const newPayment: Payment = {
    id: paymentId,
    listing_id: listingId,
    user_id: userId,
    summa,
    holat: 'tolandi', // Simulyatsiya qilingan to'lov
    tolov_provayderi: provider,
    transaction_id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
    sana: new Date().toISOString(),
    listing_title: listingTitle || 'Ko\'chmas mulk e\'loni'
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('payments').insert([
        {
          id: newPayment.id,
          listing_id: listingId,
          user_id: userId,
          summa,
          holat: 'tolandi',
          tolov_provayderi: provider,
          transaction_id: newPayment.transaction_id
        }
      ]);
    } catch (e) {
      console.warn('Supabase payment insert error:', e);
    }
  }

  // Local saqlash
  const payments = getStoredPayments();
  payments.unshift(newPayment);
  saveStoredPayments(payments);

  // E'lonni VIP holatiga o'tkazish
  await updateListing(listingId, { is_vip: true });

  return newPayment;
};

export const fetchUserPayments = async (userId: string): Promise<Payment[]> => {
  const payments = getStoredPayments();
  return payments.filter(p => p.user_id === userId);
};
