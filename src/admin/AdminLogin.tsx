import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff, Phone, UserPlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { verifyAdminCredentials, registerAdminUser } from '../services/adminService';

interface AdminLoginProps {
  onLoginSuccess: (adminInfo: { name: string; phone: string }) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regLogin, setRegLogin] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Login tekshiruvi
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanLogin = loginInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanLogin) {
      setError('Admin loginini kiriting');
      return;
    }
    if (!cleanPassword) {
      setError('Admin parolini kiriting');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyAdminCredentials(cleanLogin, cleanPassword);

      if (result.success) {
        onLoginSuccess({
          name: result.adminInfo?.name || 'Bosh Administrator',
          phone: result.adminInfo?.phone || cleanLogin
        });
      } else {
        setError(result.error || 'Xato! Login yoki parol noto\'g\'ri kiritildi.');
      }
    } catch (err: any) {
      setError(err.message || 'Kirishni tekshirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // 2. Ro'yxatdan o'tish tekshiruvi
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanName = regName.trim();
    const cleanLogin = regLogin.trim().toLowerCase();
    const cleanPhone = regPhone.trim();
    const cleanPassword = regPassword.trim();

    if (!cleanName || !cleanLogin || !cleanPhone || !cleanPassword) {
      setError('Barcha maydonlarni to\'ldiring');
      return;
    }

    if (cleanPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    if (cleanPassword !== regConfirmPassword.trim()) {
      setError('Kiritilgan parollar bir-biriga mos kelmadi');
      return;
    }

    setLoading(true);
    try {
      const res = await registerAdminUser(cleanName, cleanLogin, cleanPhone, cleanPassword);
      if (res.success) {
        setSuccessMsg('Admin hisobi muvaffaqiyatli yaratildi! Endi login va parolingiz bilan kiring.');
        setLoginInput(cleanLogin);
        setPasswordInput(cleanPassword);
        setMode('login');
      } else {
        setError(res.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
      }
    } catch (err: any) {
      setError(err.message || 'Server xatosi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6 animate-in fade-in">
        {/* Bosh sahifaga qaytish */}
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Saytga qaytish
        </button>

        {/* Logo va Icon */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            {mode === 'login' ? <ShieldCheck className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Admin Boshqaruv' : 'Admin Ro\'yxatdan O\'tish'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'login'
              ? 'Admin panelga kirish uchun login va parolni kiriting.'
              : 'Yangi admin yaratish uchun quyidagi ma\'lumotlarni to\'ldiring.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORMASI */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Login
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Login yoki telefon raqam"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Paroli
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Parolni kiriting"
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Tekshirilmoqda...' : 'Kirish va Botdan Ruxsat So\'rash'}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORMASI */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Ismi
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Masalan: Bosh Administrator"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Logini
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regLogin}
                  onChange={(e) => setRegLogin(e.target.value)}
                  placeholder="Masalan: uyborakmal"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bog'langan Telefon Raqam (Telegram uchun)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+998901234567"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Yangi Parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Parolni Tasdiqlang
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Parolni qayta kiriting"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Saqlanmoqda...' : 'Admin Sifatida Ro\'yxatdan O\'tish'}
            </button>
          </form>
        )}

        {/* 2FA Xabarnoma */}
        {mode === 'login' && (
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              2FA Xavfsizlik:
            </div>
            <p>
              Login/parol to'g'ri bo'lsa Telegram botingizga tasdiqlash xabari boradi. Botda <strong>"Ruxsat berish"</strong>ni bosganingizdan so'ng boshqaruv paneli ochiladi.
            </p>
          </div>
        )}

        {/* PASTKI KICHIK TUGMA / HAVOLA */}
        <div className="text-center pt-1 border-t border-slate-800/60">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-slate-400 hover:text-brand-400 transition-colors inline-block"
            >
              Admin hisobingiz yo'qmi? <span className="text-brand-400 underline underline-offset-4">Ro'yxatdan o'tish</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors inline-block"
            >
              Hisobingiz bormi? <span className="text-white underline underline-offset-4">Kirishga qaytish</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
