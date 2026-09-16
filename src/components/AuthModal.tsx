import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resetUserPassword } from '../services/authService';
import { sendTelegramOtpCode, verifyTelegramOtpCode, getTelegramBotOtpLink, TELEGRAM_CONFIG } from '../services/telegramService';
import {
  X,
  Smartphone,
  Lock,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Send,
  KeyRound,
  Eye,
  EyeOff,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();

  // Rejimlar: 'login' | 'register' | 'forgot_password'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Form maydonlari
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Ro'yxatdan o'tish va Parol tiklash bosqichi: 'form' | 'sms_verify'
  const [step, setStep] = useState<'form' | 'sms_verify'>('form');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  // 1. Kirish (Login)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInput = phoneOrEmail.trim();
    const cleanPassword = password.trim();

    if (!cleanInput || cleanInput === '+998 ') {
      setError('Iltimos, telefon raqamingizni kiriting');
      return;
    }
    if (!cleanPassword) {
      setError('Iltimos, parolingizni kiriting');
      return;
    }

    setLoading(true);
    try {
      await login(cleanInput, cleanPassword);
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // 2. Ro'yxatdan o'tish 1-bosqich: Telegram bot orqali kod yuborish
  const handleRequestRegisterSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Iltimos, to\'liq ismingizni kiriting');
      return;
    }
    if (!phoneOrEmail.trim() || phoneOrEmail.length < 9) {
      setError('Iltimos, to\'g\'ri telefon raqam kiriting');
      return;
    }
    if (!password || password.length < 4) {
      setError('Parol kamida 4 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    setLoading(true);
    try {
      await sendTelegramOtpCode(phoneOrEmail, 'Ro\'yxatdan o\'tish', name);
      setStep('sms_verify');
    } catch (err: any) {
      setError('Tasdiqlash kodi yuborishda xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Ro'yxatdan o'tish 2-bosqich: Telegram kodni tasdiqlash va hisob ochish
  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!smsCode.trim()) {
      setError('Telegram bot orqali yuborilgan 4 xonali kodni kiriting');
      return;
    }

    // Yuborilgan to'g'ri kodni tekshirish
    const isValidCode = await verifyTelegramOtpCode(phoneOrEmail, smsCode);
    if (!isValidCode) {
      setError('❌ Tasdiqlash kodi noto\'g\'ri! Iltimos, to\'g\'ri kodni kiriting.');
      return;
    }

    setLoading(true);
    try {
      await register(name, phoneOrEmail, undefined, password);
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Ro\'yxatdan o\'tishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // 4. Parolni unutganda 1-bosqich: Telegram bot orqali kod so'rash
  const handleRequestForgotSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneOrEmail.trim() || phoneOrEmail.length < 9) {
      setError('Iltimos, telefon raqamingizni kiriting');
      return;
    }

    setLoading(true);
    try {
      await sendTelegramOtpCode(phoneOrEmail, 'Parolni tiklash');
      setStep('sms_verify');
    } catch (err: any) {
      setError('Tasdiqlash kodi yuborishda xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Parolni tiklash 2-bosqich: Telegram kodni tasdiqlash va yangi parol o'rnatish
  const handleVerifyForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!smsCode.trim()) {
      setError('Telegram bot orqali yuborilgan 4 xonali kodni kiriting');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('Yangi parol kamida 4 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    // Yuborilgan to'g'ri kodni tekshirish
    const isValidCode = await verifyTelegramOtpCode(phoneOrEmail, smsCode);
    if (!isValidCode) {
      setError('❌ Tasdiqlash kodi noto\'g\'ri!');
      return;
    }

    setLoading(true);
    try {
      await resetUserPassword(phoneOrEmail, newPassword);
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Parolni tiklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot_password') => {
    setMode(newMode);
    setStep('form');
    setError('');
    setSmsCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
        {/* Yopish */}
        <button
          onClick={closeAuthModal}
          aria-label="Modalni yopish"
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            {mode === 'forgot_password' ? <KeyRound className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {mode === 'login'
              ? 'Hisobga kirish'
              : mode === 'register'
              ? step === 'sms_verify'
                ? 'Telegram orqali tasdiqlash'
                : 'Ro\'yxatdan o\'tish'
              : step === 'sms_verify'
              ? 'Yangi Parol O\'rnatish'
              : 'Parolni tiklash'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login'
              ? 'Telefon raqam (login) va parolingizni kiriting'
              : mode === 'register'
              ? step === 'sms_verify'
                ? 'Telegram botga yuborilgan 4 xonali kodni kiriting'
                : 'Yangi profil yaratish uchun ma\'lumotlaringizni kiriting'
              : step === 'sms_verify'
              ? 'Kodni kiriting va yangi parolingizni o\'rnating'
              : 'Ro\'yxatdan o\'tgan telefon raqamingizni kiriting'}
          </p>
        </div>

        {/* Tablar (Login / Ro'yxatdan o'tish) */}
        {mode !== 'forgot_password' && step !== 'sms_verify' && (
          <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-xl transition-all ${
                mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Kirish
            </button>
            <button
              type="button"
              onClick={() => {
                switchMode('register');
                const botUser = TELEGRAM_CONFIG.USER_BOT_USERNAME || 'uybozorcodebot';
                try {
                  window.open(`https://t.me/${botUser.replace('@', '')}?start=register`, '_blank');
                } catch {}
              }}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register' ? 'bg-[#0088cc] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Ro'yxatdan o'tish</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${mode === 'register' ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#0088cc]'}`}>Bot</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. HISOBGA KIRISH FORMASI */}
        {/* ========================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-login-phone" className="block text-xs font-medium text-gray-700 mb-1">
                Telefon raqam yoki Login
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-login-phone"
                  type="text"
                  required
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-login-password" className="text-xs font-medium text-gray-700">Parol</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot_password')}
                  className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold"
                >
                  Parolni unutdingizmi?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolingizni kiriting"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Tekshirilmoqda...' : 'Kirish'}
            </button>

            <div className="pt-3 text-center border-t border-gray-100">
              <a
                href="/admin"
                onClick={() => closeAuthModal()}
                className="text-[11px] font-bold text-slate-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1"
              >
                👑 Administrator sifatida kirish
              </a>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* 2. RO'YXATDAN O'TISH FORMASI */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* 2. RO'YXATDAN O'TISH: TELEGRAM BOT ORQALI */}
        {/* ========================================================= */}
        {mode === 'register' && step === 'form' && (
          <div className="space-y-4 py-1 animate-in fade-in">
            <div className="p-5 bg-gradient-to-b from-sky-50 to-blue-50/40 border border-sky-200 rounded-2xl text-center space-y-3.5 shadow-sm">
              <div className="w-16 h-16 bg-[#0088cc] text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
                <Send className="w-8 h-8 -rotate-12 translate-x-0.5" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-gray-900">
                  Telegram Botda ro'yxatdan o'ting
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Ro'yxatdan o'tish rasmiy <b>@{TELEGRAM_CONFIG.USER_BOT_USERNAME || 'uybozorcodebot'}</b> Telegram botimiz orqali amalga oshiriladi.
                </p>
              </div>

              <a
                href={`https://t.me/${(TELEGRAM_CONFIG.USER_BOT_USERNAME || 'uybozorcodebot').replace('@', '')}?start=register`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 bg-[#0088cc] hover:bg-[#0077b5] active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>✈️ Telegram Botda Ro'yxatdan O'tish</span>
              </a>

              <div className="p-3 bg-white/90 border border-sky-100 rounded-xl text-xs text-sky-900 text-left space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-sky-800">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" /> 3 ta oddiy qadam:
                </div>
                <ol className="list-decimal list-inside text-[11px] text-sky-700 space-y-1 leading-relaxed">
                  <li>Botda <b>"START"</b> tugmasini bosing</li>
                  <li>Ism va telefon raqamingizni yuboring</li>
                  <li>Parol o'rnating va darhol saytga kiring</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🔑 Botda ro'yxatdan o'tdingizmi? Saytga kirish</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. RO'YXATDAN O'TISH: KOD KIRITISH */}
        {/* ========================================================= */}
        {mode === 'register' && step === 'sms_verify' && (
          <form onSubmit={handleVerifyRegister} className="space-y-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-center space-y-2.5">
              <span className="font-bold text-gray-900 block text-sm">{phoneOrEmail}</span>
              <p className="text-xs text-sky-800 leading-relaxed">
                Tasdiqlash kodi <b>@{TELEGRAM_CONFIG.USER_BOT_USERNAME}</b> Telegram botimizga yuborildi.
              </p>
              <a
                href={getTelegramBotOtpLink(phoneOrEmail)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>✈️ Telegram Botdan Kodni Olish (@{TELEGRAM_CONFIG.USER_BOT_USERNAME})</span>
              </a>
            </div>

            <div>
              <label htmlFor="auth-reg-smscode" className="block text-xs font-semibold text-gray-700 text-center mb-2">
                4 xonali tasdiqlash kodini kiriting
              </label>
              <input
                id="auth-reg-smscode"
                type="text"
                autoFocus
                required
                maxLength={4}
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center py-3 bg-gray-50 border border-gray-300 rounded-2xl text-3xl font-mono tracking-widest font-black focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-gray-900 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Tasdiqlanmoqda...' : 'Tasdiqlash va Kirish'}</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    await sendTelegramOtpCode(phoneOrEmail, 'Ro\'yxatdan o\'tish', name);
                  } catch (err: any) {
                    setError('Kodni qayta yuborishda xatolik: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kodni qayta yuborish</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Raqamni o'zgartirish</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* 4. PAROLNI UNUTGANDA: TELEFON RAQAM KIRITISH */}
        {/* ========================================================= */}
        {mode === 'forgot_password' && step === 'form' && (
          <form onSubmit={handleRequestForgotSms} className="space-y-4">
            <div>
              <label htmlFor="auth-forgot-phone" className="block text-xs font-medium text-gray-700 mb-1">
                Ro'yxatdan o'tgan telefon raqamingiz
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-forgot-phone"
                  type="text"
                  required
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>Tasdiqlash kodini olish</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kirishga qaytish
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* 5. PAROLNI UNUTGANDA: KOD VA YANGI PAROL */}
        {/* ========================================================= */}
        {mode === 'forgot_password' && step === 'sms_verify' && (
          <form onSubmit={handleVerifyForgotPassword} className="space-y-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-center space-y-2.5">
              <span className="font-semibold block text-sm text-gray-900">{phoneOrEmail}</span>
              <p className="text-xs text-sky-800 leading-relaxed">
                Tasdiqlash kodi <b>@{TELEGRAM_CONFIG.USER_BOT_USERNAME}</b> Telegram botimizga yuborildi.
              </p>
              <a
                href={getTelegramBotOtpLink(phoneOrEmail)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>✈️ Telegram Botdan Kodni Olish (@{TELEGRAM_CONFIG.USER_BOT_USERNAME})</span>
              </a>
            </div>

            <div>
              <label htmlFor="auth-forgot-smscode" className="block text-xs font-semibold text-gray-700 text-center mb-1.5">
                4 xonali kodni kiriting
              </label>
              <input
                id="auth-forgot-smscode"
                type="text"
                autoFocus
                required
                maxLength={4}
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-mono tracking-widest font-black focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="auth-forgot-newpass" className="block text-xs font-medium text-gray-700 mb-1">
                Yangi Parol o'rnating
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-forgot-newpass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yangi parol (kamida 4 ta belgi)"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Yangilanmoqda...' : 'Parolni Yangilash va Kirish'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Raqamni o'zgartirish
            </button>
          </form>
        )}

        {/* Yordam va Aloqa */}
        <div className="mt-5 pt-3 border-t border-gray-100 text-center text-[11px] text-gray-500 flex flex-wrap items-center justify-center gap-1.5">
          <span>Yordam yoki savollar uchun:</span>
          <a href="https://t.me/AkeIsmtv" target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline">
            @AkeIsmtv
          </a>
          <span>•</span>
          <a href="tel:+998920825690" className="text-emerald-600 font-bold hover:underline">
            +998 92 082 56 90
          </a>
        </div>
      </div>
    </div>
  );
};
