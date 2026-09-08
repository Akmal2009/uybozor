import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/authService';
import { sendTelegramOtpCode, verifyTelegramOtpCode, getTelegramBotOtpLink } from '../services/telegramService';
import {
  X,
  User as UserIcon,
  Smartphone,
  Lock,
  Camera,
  CheckCircle2,
  Send,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [name, setName] = useState(user?.ism || '');
  const [phone, setPhone] = useState(user?.telefon || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState(user?.parol || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // Tasdiqlash bosqichi: 'form' | 'sms_verify'
  const [step, setStep] = useState<'form' | 'sms_verify'>('form');
  const [smsCode, setSmsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  // Profilni saqlashga urinish
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Agar telefon yoki parol o'zgartirilgan bo'lsa -> Telegram kod bosqichiga o'tadi
    const isPhoneChanged = phone.trim() !== user.telefon.trim();
    const isPasswordChanged = password.trim() !== (user.parol || '').trim() && password.trim() !== '';

    if (isPhoneChanged || isPasswordChanged) {
      setLoading(true);
      try {
        await sendTelegramOtpCode(phone, 'Profil ma\'lumotlarini o\'zgartirish', name);
        setStep('sms_verify');
      } catch (err: any) {
        setError('Tasdiqlash kodi yuborishda xatolik: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Faqat ism, email yoki avatar o'zgargan bo'lsa -> to'g'ridan-to'g'ri saqlaymiz
    setLoading(true);
    try {
      await updateUserProfile(user.id, {
        ism: name,
        email: email || undefined,
        avatar_url: avatarUrl || undefined
      });
      setMessage('Profil ma\'lumotlari muvaffaqiyatli yangilandi!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Telegram bot kodni kiritib tasdiqlash
  const handleVerifySmsAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!smsCode.trim()) {
      setError('Telegram bot orqali yuborilgan 4 xonali tasdiqlash kodini kiriting');
      return;
    }

    // Yuborilgan to'g'ri kodni tekshirish
    const isValidCode = verifyTelegramOtpCode(phone, smsCode);
    if (!isValidCode) {
      setError('❌ Tasdiqlash kodi noto\'g\'ri! Iltimos, to\'g\'ri 4 xonali kodni kiriting.');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(user.id, {
        ism: name,
        telefon: phone,
        email: email || undefined,
        parol: password,
        avatar_url: avatarUrl || undefined
      });
      setMessage('Telefon va parolingiz muvaffaqiyatli yangilandi!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Saqlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
        {/* Yopish */}
        <button
          onClick={onClose}
          aria-label="Profil oynasini yopish"
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          {/* Avatar */}
          <div className="relative w-20 h-20 mx-auto mb-3 group">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${name || user.ism}`}
              alt={user.ism}
              width={80}
              height={80}
              loading="lazy"
              decoding="async"
              className="w-full h-full rounded-full object-cover ring-4 ring-brand-100 shadow-md"
            />
            <button
              type="button"
              onClick={() => {
                const newSeed = prompt('Avatar uchun yangi nom kiriting:', name);
                if (newSeed) {
                  setAvatarUrl(`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newSeed)}`);
                }
              }}
              aria-label="Profil rasmini o'zgartirish"
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Rasmni o'zgartirish"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-gray-900">Mening Profilim</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Shaxsiy ma'lumotlar, rasm, telefon va parolni boshqarish
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl font-semibold text-center">
            {message}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-user-name" className="block text-xs font-medium text-gray-700 mb-1">To'liq ismingiz</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="profile-user-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-user-phone" className="block text-xs font-medium text-gray-700 mb-1">
                Telefon raqamingiz (Login)
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="profile-user-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-medium font-mono"
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Raqamni o'zgartirish uchun Telegram bot orqali tasdiqlash kodi so'raladi
              </span>
            </div>

            <div>
              <label htmlFor="profile-user-password" className="block text-xs font-medium text-gray-700 mb-1">Yangi Parol</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="profile-user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yangi parol (o'zgartirish uchun)"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Parolni o'zgartirish uchun Telegram bot orqali tasdiqlash kodi so'raladi
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash'}
            </button>
          </form>
        ) : (
          /* TELEGRAM TASDIQLASH BOSQICHI */
          <form onSubmit={handleVerifySmsAndSave} className="space-y-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-center space-y-2.5">
              <div className="text-xs font-bold text-gray-900">
                Xavfsizlik tasdig'i ({phone})
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                Tasdiqlash kodi <b>@Uybozorinbot</b> Telegram botimizga yuborildi.
              </p>
              <a
                href={getTelegramBotOtpLink(phone)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>✈️ Telegram Botdan Kodni Olish (@Uybozorinbot)</span>
              </a>
            </div>

            <div>
              <label htmlFor="profile-sms-code-input" className="block text-xs font-semibold text-gray-700 text-center mb-1.5">
                4 xonali tasdiqlash kodini kiriting
              </label>
              <input
                id="profile-sms-code-input"
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
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Tasdiqlanmoqda...' : 'Tasdiqlash va Saqlash'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Ortga qaytish
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
