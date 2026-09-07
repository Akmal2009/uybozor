import React, { useState } from 'react';
import { Listing, PaymentProvider } from '../types';
import { VIP_PRICING, processListingPayment, generatePaymentLink } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

interface PaymentModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof VIP_PRICING>('VIP_7_DAYS');
  const [provider, setProvider] = useState<PaymentProvider>('Payme');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  if (!isOpen) return null;

  const plan = VIP_PRICING[selectedPlan];

  const handlePay = async () => {
    if (!user) {
      alert('Iltimos, avval tizimga kiring');
      return;
    }

    setLoading(true);
    try {
      const payment = await processListingPayment(
        user.id,
        listing.id,
        plan.summa,
        provider,
        listing.manzil_matn
      );

      setTransactionId(payment.transaction_id || 'TXN-999123');
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch (e) {
      alert('To\'lovda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const paymentLink = generatePaymentLink(provider, plan.summa, listing.id, listing.manzil_matn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          aria-label="To'lov oynasini yopish"
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">To'lov muvaffaqiyatli amalga oshirildi!</h3>
            <p className="text-sm text-gray-600">
              E'loningiz <strong>VIP</strong> maqomiga o'tkazildi va qidiruvda eng yuqorida ko'rsatiladi.
            </p>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
              <div>Tranzaksiya ID: <span className="font-mono font-bold text-gray-900">{transactionId}</span></div>
              <div>Provayder: <span className="font-semibold text-brand-700">{provider}</span></div>
              <div>Summa: <span className="font-semibold text-emerald-700">{plan.summa.toLocaleString()} UZS</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-1">
                <Sparkles className="w-4 h-4" />
                E'lonni tezroq sotish / ijaraga berish
              </div>
              <h3 className="text-xl font-bold text-gray-900">VIP xizmatini faollashtirish</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                E'lon: <strong>{listing.manzil_matn}</strong>
              </p>
            </div>

            {/* Tarifni tanlash */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Tarifni tanlang:
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {(Object.keys(VIP_PRICING) as Array<keyof typeof VIP_PRICING>).map((key) => {
                  const item = VIP_PRICING[key];
                  const isSelected = selectedPlan === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedPlan(key)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">
                            Ko'rishlar soni 10 barobargacha oshadi
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-brand-700">
                          {item.summa.toLocaleString()} UZS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* To'lov provayderini tanlash: Payme yoki Click */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                To'lov tizimini tanlang:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('Payme')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    provider === 'Payme'
                      ? 'border-[#00CCCC] bg-[#00CCCC]/10 ring-2 ring-[#00CCCC]/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="h-7 font-black tracking-widest text-[#00CCCC] flex items-center text-lg">
                    payme
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700">Payme orqali to'lash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('Click')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    provider === 'Click'
                      ? 'border-[#0073FF] bg-[#0073FF]/10 ring-2 ring-[#0073FF]/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="h-7 font-black tracking-wider text-[#0073FF] flex items-center text-lg">
                    CLICK
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700">Click orqali to'lash</span>
                </button>
              </div>
            </div>

            {/* To'lov qilish tugmasi */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  'To\'lov o\'tkazilmoqda...'
                ) : (
                  <>
                    <span>{plan.summa.toLocaleString()} UZS To'lash ({provider})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                To'lov xavfsiz shifrlangan protokol orqali himoyalangan
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
