import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createListing, fetchListingById, updateListing } from '../services/listingService';
import { compressImageFile } from '../services/imageUtils';
import { MapPicker } from '../components/MapPicker';
import { ListingType, Currency } from '../types';
import {
  TELEGRAM_CONFIG,
  sendTelegramNotification,
  startTelegramBotPolling
} from '../services/telegramService';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Phone,
  Home,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Clock,
  ShieldCheck
} from 'lucide-react';

// ============================================================================
// ⚙️ ASOSIY SOZLAMALAR (CONFIG SECTION)
// ============================================================================
export const CONFIG = {
  // 1. Telegram Bot Token (@BotFather orqali olingan)
  TELEGRAM_BOT_TOKEN: TELEGRAM_CONFIG.BOT_TOKEN,

  // 2. Admin Chat ID (@userinfobot orqali olingan admin ID)
  ADMIN_CHAT_ID: TELEGRAM_CONFIG.ADMIN_CHAT_ID,

  // 3. Supabase URL manzili
  SUPABASE_URL: 'https://vueidtzvefxkaxdfsiad.supabase.co',

  // 4. Supabase Anon ochiq kaliti
  SUPABASE_ANON_KEY: 'sb_publishable_X-uV8iJElbjAqsmyrUq7ww_60wy08bc'
};

const CITIES = [
  'Toshkent',
  'Samarqand',
  'Buxoro',
  'Farg\'ona',
  'Andijon',
  'Namangan',
  'Navoiy',
  'Qarshi',
  'Urganch',
  'Nukus',
  'Jizzax',
  'Guliston',
  'Termiz'
];

import { UZBEKISTAN_REGIONS } from '../services/regionsData';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { user, isAuthenticated, openAuthModal } = useAuth();

  // Oqim bosqichlari: 'form' -> 'success'
  const [step, setStep] = useState<'form' | 'success'>('form');

  // Forma ma'lumotlari
  const [turi, setTuri] = useState<ListingType>('sotuv');

  // 3 ta manzil inputi: Viloyat, Tuman/Shahar, Mahalla/Ko'cha
  const [viloyat, setViloyat] = useState('Toshkent shahri');
  const [tuman, setTuman] = useState('Yunusobod tumani');
  const [mahalla, setMahalla] = useState('');

  const [lat, setLat] = useState(41.2995);
  const [lng, setLng] = useState(69.2401);
  const [xonalarSoni, setXonalarSoni] = useState(2);
  const [maydon, setMaydon] = useState<number | ''>(65);
  const [qavat, setQavat] = useState<number | ''>(3);
  const [umumiyQavat, setUmumiyQavat] = useState<number | ''>(9);
  const [narx, setNarx] = useState<number | ''>(75000);
  const [valyuta, setValyuta] = useState<Currency>('USD');
  const [telefon, setTelefon] = useState(user?.telefon || '+998 ');
  const [izoh, setIzoh] = useState('');
  const [tamiri, setTamiri] = useState<'Yevro ta\'mir' | 'O\'rtacha' | 'Ta\'mirsiz' | 'Mualliflik loyihasi'>('Yevro ta\'mir');
  const [binoTuri, setBinoTuri] = useState<'G\'ishtli' | 'Monolit' | 'Panelli'>('G\'ishtli');
  const [mebel, setMebel] = useState(false);
  const [texnika, setTexnika] = useState(false);
  const [requestVip, setRequestVip] = useState(false);

  const [rasmlar, setRasmlar] = useState<string[]>([
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
  ]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Viloyat o'zgarganda tuman va xaritani moslash
  const handleViloyatChange = (newViloyat: string) => {
    setViloyat(newViloyat);
    const region = UZBEKISTAN_REGIONS.find(r => r.name === newViloyat);
    if (region) {
      if (region.districts.length > 0) {
        setTuman(region.districts[0].name);
        setLat(region.districts[0].lat);
        setLng(region.districts[0].lng);
      } else {
        setLat(region.lat);
        setLng(region.lng);
      }
    }
  };

  // Tuman o'zgarganda xaritani siljitish
  const handleTumanChange = (newTuman: string) => {
    setTuman(newTuman);
    const region = UZBEKISTAN_REGIONS.find(r => r.name === viloyat);
    const dist = region?.districts.find(d => d.name === newTuman);
    if (dist) {
      setLat(dist.lat);
      setLng(dist.lng);
    }
  };

  // Xaritada joylashuv o'zgarganda tepadagi 3 ta inputni avtomatik to'ldirish
  const handleLocationChange = (newLat: number, newLng: number, addressInfo?: any) => {
    setLat(newLat);
    setLng(newLng);

    if (addressInfo) {
      // 1. Viloyatni aniqlash
      if (addressInfo.state) {
        const stateLow = addressInfo.state.toLowerCase();
        const foundReg = UZBEKISTAN_REGIONS.find(
          r =>
            stateLow.includes(r.name.toLowerCase().replace(' viloyati', '').replace(' respublikasi', '')) ||
            r.name.toLowerCase().includes(stateLow)
        );
        if (foundReg) {
          setViloyat(foundReg.name);

          // 2. Tumanni aniqlash
          if (addressInfo.city) {
            const cityLow = addressInfo.city.toLowerCase();
            const foundDist = foundReg.districts.find(
              d =>
                cityLow.includes(d.name.toLowerCase().replace(' tumani', '').replace(' shahri', '')) ||
                d.name.toLowerCase().includes(cityLow)
            );
            if (foundDist) {
              setTuman(foundDist.name);
            }
          }
        }
      }

      // 3. Mahalla / ko'chani aniqlash
      if (addressInfo.street) {
        setMahalla(addressInfo.street);
      }
    }
  };

  // Telegram bot polling'ni ishga tushirish
  useEffect(() => {
    startTelegramBotPolling();
  }, []);

  // Edit rejimini tekshirish
  useEffect(() => {
    if (editId) {
      setIsEditMode(true);
      fetchListingById(editId).then(item => {
        if (item) {
          setTuri(item.turi);
          if (item.viloyat) setViloyat(item.viloyat);
          if (item.tuman) setTuman(item.tuman);
          if (item.mahalla) setMahalla(item.mahalla);
          setLat(item.manzil_lat);
          setLng(item.manzil_lng);
          setXonalarSoni(item.xonalar_soni);
          setMaydon(item.maydon);
          setQavat(item.qavat);
          setUmumiyQavat(item.umumiy_qavat);
          setNarx(item.narx);
          setValyuta(item.valyuta);
          setTelefon(item.telefon);
          setIzoh(item.izoh || '');
          if (item.rasmlar && item.rasmlar.length > 0) {
            setRasmlar(item.rasmlar);
          }
          if (item.tamiri) setTamiri(item.tamiri);
          if (item.bino_turi) setBinoTuri(item.bino_turi);
          if (item.mebel !== undefined) setMebel(item.mebel);
          if (item.texnika !== undefined) setTexnika(item.texnika);
        }
      });
    }
  }, [editId]);

  useEffect(() => {
    if (user && (!telefon || telefon === '+998 ')) {
      setTelefon(user.telefon);
    }
  }, [user]);

  // Rasm yuklash (Avtomatik siqish bilan)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setErrorMessage('');
    for (const file of Array.from(files)) {
      try {
        const compressedBase64 = await compressImageFile(file);
        setRasmlar(prev => [...prev, compressedBase64]);
      } catch (err) {
        console.error('Rasm yuklashda xatolik:', err);
      }
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setRasmlar(prev => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setRasmlar(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    setRasmlar(prev => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  // 1-bosqich: Formani tekshirish va To'lov sahifasiga o'tish
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthenticated || !user) {
      openAuthModal();
      return;
    }

    if (user.is_blocked) {
      setErrorMessage('Sizning hisobingiz administrator tomonidan bloklangan. Yangi e\'lon joylashtira olmaysiz.');
      return;
    }

    if (!viloyat) {
      setErrorMessage('Iltimos, viloyatni tanlang');
      return;
    }
    if (!tuman && !mahalla) {
      setErrorMessage('Iltimos, tuman yoki mahalla manzilini kiriting');
      return;
    }
    if (!narx || Number(narx) <= 0) {
      setErrorMessage('Iltimos, to\'g\'ri narx kiriting');
      return;
    }
    if (!maydon || Number(maydon) <= 0) {
      setErrorMessage('Iltimos, maydon o\'lchamini kiriting');
      return;
    }
    if (rasmlar.length === 0) {
      setErrorMessage('Kamida 1 ta rasm yuklashingiz kerak');
      return;
    }

    const shahar = viloyat && tuman ? `${viloyat}, ${tuman}` : (viloyat || tuman || 'Toshkent');
    const manzilMatn = mahalla.trim() ? (tuman ? `${tuman}, ${mahalla.trim()}` : mahalla.trim()) : (tuman || viloyat);

    if (isEditMode && editId) {
      setLoading(true);
      try {
        await updateListing(editId, {
          turi,
          shahar,
          viloyat,
          tuman,
          mahalla,
          manzil_matn: manzilMatn,
          manzil_lat: lat,
          manzil_lng: lng,
          xonalar_soni: Number(xonalarSoni),
          maydon: Number(maydon),
          qavat: Number(qavat) || 1,
          umumiy_qavat: Number(umumiyQavat) || 1,
          narx: Number(narx),
          valyuta,
          telefon,
          izoh,
          rasmlar,
          tamiri,
          bino_turi: binoTuri,
          mebel,
          texnika,
          can_edit: false, // 1 martalik tahrirlash huquqi ishlatildi
          edit_requested: false
        });
        navigate(`/listing/${editId}`);
      } catch (err: any) {
        setErrorMessage(err.message || 'E\'lonni yangilashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Yangi e'lon bo'lsa -> To'lovsiz to'g'ridan-to'g'ri e'lonni saqlash va Telegram botga yuborish
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. E'lonni Supabase / LocalStorage'ga holat='kutilmoqda' bilan saqlash
      const newListing = await createListing({
        user_id: user.id,
        turi,
        shahar,
        viloyat,
        tuman,
        mahalla,
        manzil_matn: manzilMatn,
        manzil_lat: lat,
        manzil_lng: lng,
        xonalar_soni: Number(xonalarSoni),
        maydon: Number(maydon),
        qavat: Number(qavat) || 1,
        umumiy_qavat: Number(umumiyQavat) || 1,
        narx: Number(narx),
        valyuta,
        telefon,
        izoh,
        rasmlar,
        holat: 'kutilmoqda', // E'lon kutilmoqda holatida saqlanadi
        is_vip: false,
        vip_requested: requestVip,
        tamiri,
        bino_turi: binoTuri,
        mebel,
        texnika
      });

      // 2. Telegram Bot orqali admin chatiga yangi e'lon haqida xabar va tasdiqlash tugmalarini yuborish
      await sendTelegramNotification({
        id: newListing.id,
        turi,
        manzil: manzilMatn,
        shahar,
        narx: Number(narx),
        valyuta,
        telefon,
        summa: 0,
        maydon: Number(maydon),
        xonalar: Number(xonalarSoni),
        vipRequested: requestVip
      });

      // 3. Muvaffaqiyatli saqlanganlik sahifasiga o'tish
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'E\'lonni joylashtirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // KO'RINISH: 3-BOSQICH — FAQAT BILDIRISHNOMA (HECH QANDAY TASDIQLASH TUGMASISIZ)
  // Foydalanuvchi faqat to'lov qabul qilinganligi va admin tasdig'i kutilayotganini ko'radi.
  // Tasdiqlash faqat Telegram Bot ichida amalga oshiriladi.
  // ============================================================================
  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              E'loningiz muvaffaqiyatli qabul qilindi!
            </h1>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-sm space-y-1">
              <div className="font-bold flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>E'loningiz moderator (admin) tomonidan tekshirilmoqda</span>
              </div>
              <p className="text-xs text-amber-700 pt-1">
                E'lon ma'lumotlari adminga yuborildi. Admin tasdiqlaganidan so'ng e'loningiz saytda faollashadi.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/my-listings"
              className="px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-colors text-center"
            >
              Mening e'lonlarimga o'tish
            </Link>
            <Link
              to="/"
              className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs sm:text-sm transition-colors text-center"
            >
              Bosh sahifa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // KO'RINISH: 1-BOSQICH — E'LON JOYLASH SHAKLI (FORM)
  // ============================================================================
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Orqaga qaytish
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 pb-6 mb-8">
          <div className="flex items-center gap-2 text-brand-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            {isEditMode ? 'E\'lonni tahrirlash' : 'Bepul e\'lon joylash'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            {isEditMode ? 'Ko\'chmas mulk ma\'lumotlarini yangilash' : 'Ko\'chmas mulk e\'lonini joylash'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            E'lon ma'lumotlarini to'ldiring. E'lon yuborilgach administrator tomonidan tekshirilib saytda faollashtiriladi.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-8">
          {/* 1. Mulk turi (Sotuv / Ijara) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              1. E'lon turi
            </label>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                type="button"
                onClick={() => setTuri('sotuv')}
                className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  turi === 'sotuv'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Home className="w-4 h-4" />
                Sotuv (Sotish)
              </button>

              <button
                type="button"
                onClick={() => setTuri('ijara')}
                className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  turi === 'ijara'
                    ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Home className="w-4 h-4" />
                Ijara (Ijaraga berish)
              </button>
            </div>
          </div>

          {/* 2. Rasmlar yuklash */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-brand-600" />
                2. Rasmlar (Har biri max 5MB)
              </label>
              <span className="text-xs text-gray-500 font-medium">{rasmlar.length} ta rasm yuklangan</span>
            </div>

            <div className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-3xl p-6 text-center bg-gray-50/60 transition-colors">
              <Upload className="w-10 h-10 text-brand-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">
                Rasmlarni tanlang yoki bu yerga sudrab tashlang
              </p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                JPG, PNG yoki WEBP formatda. Har bir rasm maksimal 5MB.
              </p>

              <label htmlFor="file-upload-input" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                <span>Fayllarni tanlash</span>
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  aria-label="Fayllarni tanlash"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="mt-4 pt-4 border-t border-gray-200 max-w-md mx-auto flex gap-2">
                <label htmlFor="image-url-input" className="sr-only">Rasm URL manzili</label>
                <input
                  id="image-url-input"
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Yoki to'g'ridan-to'g'ri rasm URL manzilini kiriting..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  aria-label="Rasm URL qo'shish"
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold"
                >
                  Qo'shish
                </button>
              </div>
            </div>

            {rasmlar.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {rasmlar.map((img, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 border border-gray-200 shadow-sm">
                    <img
                      src={img}
                      alt={`Yuklangan rasm ${idx + 1}`}
                      width={300}
                      height={225}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                        Asosiy muqova
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(idx)}
                          aria-label={`Rasm ${idx + 1}ni asosiy muqova qilish`}
                          className="p-1.5 bg-white text-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-100"
                          title="Asosiy rasm qilish"
                        >
                          Asosiy
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={`Rasm ${idx + 1}ni o'chirish`}
                        className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Manzil va Xarita (3 ta aniq kiritish maydoni) */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                3. Joylashuv va Manzil (3 ta maydon)
              </label>
              <span className="text-xs text-gray-500 font-medium">
                Xaritadan tanlansa yoki qo'lda to'ldirilsa ham qabul qilinadi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1-Input: Viloyat */}
              <div>
                <label htmlFor="create-viloyat-select" className="block text-xs font-medium text-gray-700 mb-1">
                  1. Viloyat / Hudud <span className="text-red-500">*</span>
                </label>
                <select
                  id="create-viloyat-select"
                  value={viloyat}
                  onChange={(e) => handleViloyatChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  {UZBEKISTAN_REGIONS.map(reg => (
                    <option key={reg.name} value={reg.name}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2-Input: Tuman yoki Shahar */}
              <div>
                <label htmlFor="create-tuman-select" className="block text-xs font-medium text-gray-700 mb-1">
                  2. Tuman yoki Shahar <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const reg = UZBEKISTAN_REGIONS.find(r => r.name === viloyat);
                  const districts = reg ? reg.districts : [];
                  return districts.length > 0 ? (
                    <select
                      id="create-tuman-select"
                      value={tuman}
                      onChange={(e) => handleTumanChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    >
                      {districts.map(d => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="create-tuman-select"
                      type="text"
                      value={tuman}
                      onChange={(e) => setTuman(e.target.value)}
                      placeholder="Tuman yoki shahar nomini kiriting"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  );
                })()}
              </div>

              {/* 3-Input: Mahalla / Ko'cha / Uy */}
              <div>
                <label htmlFor="create-mahalla-input" className="block text-xs font-medium text-gray-700 mb-1">
                  3. Mahalla / Ko'cha / Uy <span className="text-gray-400 font-normal">(ixtiyoriy)</span>
                </label>
                <input
                  id="create-mahalla-input"
                  type="text"
                  value={mahalla}
                  onChange={(e) => setMahalla(e.target.value)}
                  placeholder="Masalan: Mustaqillik MFY, Navoiy ko'chasi 15-uy"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-3">
              <MapPicker
                lat={lat}
                lng={lng}
                onLocationChange={handleLocationChange}
              />
            </div>
          </div>

          {/* 4. Mulk parametrlari */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              4. Mulk parametrlari
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="create-xonalar-input" className="block text-xs font-medium text-gray-700 mb-1">Xonalar soni</label>
                <input
                  id="create-xonalar-input"
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={xonalarSoni}
                  onChange={(e) => setXonalarSoni(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="create-maydon-input" className="block text-xs font-medium text-gray-700 mb-1">Maydoni (m²)</label>
                <input
                  id="create-maydon-input"
                  type="number"
                  step="0.1"
                  min="5"
                  required
                  value={maydon}
                  onChange={(e) => setMaydon(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Masalan: 72.5"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="create-qavat-input" className="block text-xs font-medium text-gray-700 mb-1">Qavat</label>
                <input
                  id="create-qavat-input"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={qavat}
                  onChange={(e) => setQavat(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="create-umumiy-qavat-input" className="block text-xs font-medium text-gray-700 mb-1">Binoning umumiy qavati</label>
                <input
                  id="create-umumiy-qavat-input"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={umumiyQavat}
                  onChange={(e) => setUmumiyQavat(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="create-tamiri-select" className="block text-xs font-medium text-gray-700 mb-1">Ta'mirlash holati</label>
                <select
                  id="create-tamiri-select"
                  value={tamiri}
                  onChange={(e) => setTamiri(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Yevro ta'mir">Yevro ta'mir</option>
                  <option value="Mualliflik loyihasi">Mualliflik loyihasi (Dizaynerlik)</option>
                  <option value="O'rtacha">O'rtacha (Yaxshi)</option>
                  <option value="Ta'mirsiz">Ta'mirsiz (Qora suvoq)</option>
                </select>
              </div>

              <div>
                <label htmlFor="create-bino-turi-select" className="block text-xs font-medium text-gray-700 mb-1">Bino turi</label>
                <select
                  id="create-bino-turi-select"
                  value={binoTuri}
                  onChange={(e) => setBinoTuri(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="G'ishtli">G'ishtli (Kiprich)</option>
                  <option value="Monolit">Monolit (Temir-beton)</option>
                  <option value="Panelli">Panelli</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label htmlFor="create-mebel-checkbox" className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  id="create-mebel-checkbox"
                  type="checkbox"
                  checked={mebel}
                  onChange={(e) => setMebel(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span>Mebellari bilan</span>
              </label>

              <label htmlFor="create-texnika-checkbox" className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  id="create-texnika-checkbox"
                  type="checkbox"
                  checked={texnika}
                  onChange={(e) => setTexnika(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span>Maishiy texnika mavjud</span>
              </label>
            </div>
          </div>

          {/* 5. Narx va Aloqa */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              5. Narx va Bog'lanish
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="create-narx-input" className="block text-xs font-medium text-gray-700 mb-1">
                  Narxi ({turi === 'ijara' ? 'oylik' : 'umumiy'})
                </label>
                <div className="flex gap-2">
                  <input
                    id="create-narx-input"
                    type="number"
                    min="1"
                    required
                    value={narx}
                    onChange={(e) => setNarx(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Masalan: 75000"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold"
                  />
                  <select
                    id="create-valyuta-select"
                    aria-label="Valyutani tanlash"
                    value={valyuta}
                    onChange={(e) => setValyuta(e.target.value as any)}
                    className="w-24 bg-gray-100 border border-gray-200 rounded-xl px-2 text-sm font-bold text-gray-700"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="UZS">UZS (so'm)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="create-telefon-input" className="block text-xs font-medium text-gray-700 mb-1">Aloqa uchun telefon</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="create-telefon-input"
                    type="text"
                    required
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="create-izoh-textarea" className="block text-xs font-medium text-gray-700 mb-1">Qo'shimcha izoh va ma'lumotlar</label>
              <textarea
                id="create-izoh-textarea"
                rows={4}
                value={izoh}
                onChange={(e) => setIzoh(e.target.value)}
                placeholder="Uyning afzalliklari, infratuzilmasi, yaqinidagi metro yoki savdo markazlari haqida batafsil ma'lumot bering..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            {/* VIP Maqomi So'rovi */}
            {!isEditMode && (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50/60 rounded-2xl border border-amber-200 flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 fill-amber-500 text-amber-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="vip-toggle" className="text-sm font-bold text-amber-950 cursor-pointer">
                      ⭐ VIP (Premium) E'lon sifatida so'rov yuborish
                    </label>
                    <input
                      id="vip-toggle"
                      type="checkbox"
                      checked={requestVip}
                      onChange={(e) => setRequestVip(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded-lg accent-amber-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    VIP e'lonlar saytda eng yuqorida alohida ajratilib ko'rsatiladi. Admin ruxsat berganida VIP maqomi beriladi.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Saqlash va E'lonni yuklash tugmasi */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold rounded-2xl text-sm transition-colors"
            >
              Bekor qilish
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Yuborilmoqda...' : isEditMode ? 'O\'zgarishlarni saqlash' : 'E\'lonni yuklash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
