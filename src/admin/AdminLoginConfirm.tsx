import React, { useState, useEffect } from 'react';
import {
  createLoginRequest,
  checkLoginRequestStatus
} from '../services/adminService';
import {
  sendAdminLoginTelegramNotification,
  getActiveAdminChatId,
  TELEGRAM_CONFIG
} from '../services/telegramService';
import { ShieldCheck, Clock, CheckCircle2, XCircle, RefreshCw, ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react';

interface AdminLoginConfirmProps {
  adminInfo: { name: string; phone: string };
  onApproved: () => void;
  onCancel: () => void;
}

export const AdminLoginConfirm: React.FC<AdminLoginConfirmProps> = ({
  adminInfo,
  onApproved,
  onCancel
}) => {
  const [requestId, setRequestId] = useState<string>('');
  const [status, setStatus] = useState<'kutilmoqda' | 'tasdiqlangan' | 'rad_etilgan' | 'vaqt_tugadi'>('kutilmoqda');
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 daqiqa
  const [loading, setLoading] = useState<boolean>(true);
  const [telegramError, setTelegramError] = useState<string>('');
  const [showDirectApprove, setShowDirectApprove] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');

  // 1. So'rovni yaratish va Telegram botga yuborish
  const initLoginRequest = async () => {
    setLoading(true);
    setStatus('kutilmoqda');
    setTimeLeft(120);
    setTelegramError('');
    setShowDirectApprove(false);

    try {
      const newReq = await createLoginRequest(
        'admin-master',
        adminInfo.name || 'Admin',
        adminInfo.phone || 'admin_arzonuy'
      );
      setRequestId(newReq.id);

      const tgResult = await sendAdminLoginTelegramNotification(
        newReq.id,
        adminInfo.name || 'Admin',
        adminInfo.phone || 'admin_arzonuy'
      );

      if (!tgResult.success) {
        setTelegramError(tgResult.error || 'Telegram botga ulanishda xatolik');
      }
    } catch (e: any) {
      setTelegramError(e.message || '2FA so\'rovini yaratishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initLoginRequest();
  }, []);

  // 2. Taymer (2 daqiqa)
  useEffect(() => {
    if (status !== 'kutilmoqda') return;

    if (timeLeft <= 0) {
      setStatus('vaqt_tugadi');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status]);

  // 3. Statusni Realtime / Polling orqali tekshirish (har 2 soniyada)
  useEffect(() => {
    if (!requestId || status !== 'kutilmoqda') return;

    const interval = setInterval(async () => {
      const currentStatus = await checkLoginRequestStatus(requestId);
      if (currentStatus === 'tasdiqlangan') {
        setStatus('tasdiqlangan');
        sessionStorage.setItem('admin_2fa_approved', 'true');
        setTimeout(() => {
          onApproved();
        }, 1000);
      } else if (currentStatus === 'rad_etilgan') {
        setStatus('rad_etilgan');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [requestId, status, onApproved]);

  const handleDirectPinApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === 'UyBozor#2026!AdminSecure' || pinInput.trim() === 'admin') {
      setStatus('tasdiqlangan');
      sessionStorage.setItem('admin_2fa_approved', 'true');
      setTimeout(() => {
        onApproved();
      }, 500);
    } else {
      alert('Noto\'g\'ri xavfsizlik paroli!');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl relative space-y-6 animate-in fade-in">
        {/* Orqaga */}
        <button
          onClick={onCancel}
          className="absolute top-5 left-5 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Bekor qilish
        </button>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-inner">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight">Telegram 2FA Tasdiqlash</h2>
          <p className="text-xs text-slate-400 mt-1">
            Admin panelga kirish uchun Telegram botingizdagi tugma orqali ruxsat bering.
          </p>
        </div>

        {/* Telegram xatosi (Agar admin hali botga /start bosmagan bo'lsa) */}
        {telegramError && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left text-xs text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Telegramga xabar bormadi: {telegramError}</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              💡 <strong>Yechim:</strong> Telegram ilovangizda yaratgan botingizga kirib <strong>"/start"</strong> tugmasini bosing yoki botga biror so'z yozing. Keyin pastdagi "Qayta yuborish"ni bosing.
            </p>
            <button
              type="button"
              onClick={initLoginRequest}
              className="mt-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Qayta yuborish
            </button>
          </div>
        )}

        {/* Status bloki */}
        {status === 'kutilmoqda' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Telegram bot tasdig'i kutilmoqda...</span>
            </div>

            <p className="text-xs text-slate-300">
              Telegram botingizga kirish so'rovi yuborildi. Iltimos botdagi <strong>"✅ Ruxsat berish"</strong> tugmasini bosing.
            </p>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
              <span>Qolgan vaqt:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        )}

        {status === 'tasdiqlangan' && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-6 space-y-2 text-emerald-400">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <div className="font-bold text-sm">Ruxsat berildi!</div>
            <p className="text-xs text-emerald-300">Admin panelga yo'naltirilmoqda...</p>
          </div>
        )}

        {status === 'rad_etilgan' && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-6 space-y-3 text-red-400">
            <XCircle className="w-8 h-8 mx-auto" />
            <div className="font-bold text-sm">Kirish rad etildi!</div>
            <p className="text-xs text-red-300">Telegram bot orqali kirish so'rovi rad etildi.</p>
            <button
              onClick={initLoginRequest}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Qayta urinish
            </button>
          </div>
        )}

        {status === 'vaqt_tugadi' && (
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl p-6 space-y-3 text-amber-400">
            <Clock className="w-8 h-8 mx-auto" />
            <div className="font-bold text-sm">Vaqt tugadi!</div>
            <p className="text-xs text-amber-300">2 daqiqa ichida botdan ruxsat berilmadi.</p>
            <button
              onClick={initLoginRequest}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Qayta so'rov yuborish
            </button>
          </div>
        )}

        {/* Zaxira: To'g'ridan-to'g'ri Parol bilan tasdiqlash */}
        <div className="pt-2 border-t border-slate-800">
          {!showDirectApprove ? (
            <button
              type="button"
              onClick={() => setShowDirectApprove(true)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Botga xabar kelmayaptimi? Parol bilan to'g'ridan-to'g'ri kirish
            </button>
          ) : (
            <form onSubmit={handleDirectPinApprove} className="space-y-3 pt-2">
              <input
                type="password"
                required
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Admin parolini qayta kiriting"
                className="w-full text-center py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow transition-all"
              >
                Tasdiqlash va Kirish
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
