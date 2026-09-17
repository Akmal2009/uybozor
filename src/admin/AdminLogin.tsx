import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { verifyAdminCredentials } from '../services/adminService';

interface AdminLoginProps {
  onLoginSuccess: (adminInfo: { name: string; phone: string }) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    const validLogins = ['uyborakmal', 'admin_arzonuy', 'admin', 'arzonuy'];
    if (!validLogins.includes(cleanLogin)) {
      setError('Xato! Login yoki parol noto\'g\'ri kiritildi.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyAdminCredentials(cleanLogin, cleanPassword);

      if (result.success) {
        onLoginSuccess({
          name: 'Bosh Administrator',
          phone: cleanLogin
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
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Admin Boshqaruv</h2>
          <p className="text-xs text-slate-400">
            Admin panelga kirish uchun login va parolni kiriting.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Loginni kiriting"
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

        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            2FA Xavfsizlik:
          </div>
          <p>
            Login/parol to'g'ri bo'lsa ham Telegram botingizga tasdiqlash xabari boradi. Faqat siz botda <strong>"Ruxsat berish"</strong>ni bosganingizdan so'ng kirish ochiladi.
          </p>
        </div>
      </div>
    </div>
  );
};
