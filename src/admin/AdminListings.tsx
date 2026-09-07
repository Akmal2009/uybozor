import React, { useState, useEffect } from 'react';
import { Listing, ListingStatus, ListingType, Currency } from '../types';
import { fetchAllAdminListings } from '../services/adminService';
import { createListing, updateListing, deleteListing } from '../services/listingService';
import { compressImageFile } from '../services/imageUtils';
import { UZBEKISTAN_REGIONS } from '../services/regionsData';
import { MapPicker } from '../components/MapPicker';
import {
  Home,
  Check,
  X,
  Trash2,
  Eye,
  Search,
  Sparkles,
  Phone,
  Layers,
  Maximize2,
  Bed,
  MapPin,
  Clock,
  Edit3,
  PlusCircle,
  Upload,
  CheckCircle2,
  Building,
  Image as ImageIcon
} from 'lucide-react';

export const AdminListings: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('barchasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Yangi e'lon qo'shish modali holati
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Yangi e'lon forma maydonlari
  const [formTuri, setFormTuri] = useState<ListingType>('sotuv');
  const [formIsVip, setFormIsVip] = useState(false);
  const [formViloyat, setFormViloyat] = useState('Toshkent shahri');
  const [formTuman, setFormTuman] = useState('Yunusobod tumani');
  const [formMahalla, setFormMahalla] = useState('');
  const [formLat, setFormLat] = useState(41.2995);
  const [formLng, setFormLng] = useState(69.2401);
  const [formXonalar, setFormXonalar] = useState<number>(2);
  const [formMaydon, setFormMaydon] = useState<number>(65);
  const [formQavat, setFormQavat] = useState<number>(3);
  const [formUmumiyQavat, setFormUmumiyQavat] = useState<number>(9);
  const [formNarx, setFormNarx] = useState<number>(55000);
  const [formValyuta, setFormValyuta] = useState<Currency>('USD');
  const [formTelefon, setFormTelefon] = useState('+998 90 123 45 67');
  const [formIzoh, setFormIzoh] = useState('');
  const [formTamiri, setFormTamiri] = useState<'Yevro ta\'mir' | 'O\'rtacha' | 'Ta\'mirsiz' | 'Mualliflik loyihasi'>('Yevro ta\'mir');
  const [formBinoTuri, setFormBinoTuri] = useState<'G\'ishtli' | 'Monolit' | 'Panelli'>('G\'ishtli');
  const [formMebel, setFormMebel] = useState(false);
  const [formTexnika, setFormTexnika] = useState(false);
  const [formRasmlar, setFormRasmlar] = useState<string[]>([
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
  ]);
  const [formImageUrl, setFormImageUrl] = useState('');

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAdminListings();
      setListings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleStatusChange = async (id: string, newStatus: ListingStatus) => {
    await updateListing(id, { holat: newStatus });
    setListings(prev =>
      prev.map(item => (item.id === id ? { ...item, holat: newStatus } : item))
    );
    if (selectedListing && selectedListing.id === id) {
      setSelectedListing(prev => (prev ? { ...prev, holat: newStatus } : null));
    }
  };

  // VIP holatini o'zgartirish (oddiy <-> VIP)
  const handleToggleVip = async (id: string, currentVip: boolean) => {
    const nextVip = !currentVip;
    await updateListing(id, { is_vip: nextVip });
    setListings(prev =>
      prev.map(item => (item.id === id ? { ...item, is_vip: nextVip } : item))
    );
    if (selectedListing && selectedListing.id === id) {
      setSelectedListing(prev => (prev ? { ...prev, is_vip: nextVip } : null));
    }
  };

  const handleAllowEdit = async (id: string) => {
    await updateListing(id, { can_edit: true, edit_requested: false });
    setListings(prev =>
      prev.map(item => (item.id === id ? { ...item, can_edit: true, edit_requested: false } : item))
    );
    alert('Foydalanuvchiga e\'lonni 1 marta tahrirlash huquqi berildi!');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Haqiqatan ham ushbu e\'lonni bazadan butunlay o\'chirmoqchimisiz?')) {
      await deleteListing(id);
      setListings(prev => prev.filter(item => item.id !== id));
      if (selectedListing && selectedListing.id === id) {
        setSelectedListing(null);
      }
    }
  };

  // Viloyat o'zgarganda
  const handleFormViloyatChange = (v: string) => {
    setFormViloyat(v);
    const reg = UZBEKISTAN_REGIONS.find(r => r.name === v);
    if (reg && reg.districts.length > 0) {
      setFormTuman(reg.districts[0].name);
      setFormLat(reg.districts[0].lat);
      setFormLng(reg.districts[0].lng);
    }
  };

  // Tuman o'zgarganda
  const handleFormTumanChange = (t: string) => {
    setFormTuman(t);
    const reg = UZBEKISTAN_REGIONS.find(r => r.name === formViloyat);
    const dist = reg?.districts.find(d => d.name === t);
    if (dist) {
      setFormLat(dist.lat);
      setFormLng(dist.lng);
    }
  };

  // Xaritadan joylashuv o'zgarganda
  const handleFormLocationChange = (newLat: number, newLng: number, addressInfo?: any) => {
    setFormLat(newLat);
    setFormLng(newLng);
    if (addressInfo) {
      if (addressInfo.state) {
        const stateLow = addressInfo.state.toLowerCase();
        const foundReg = UZBEKISTAN_REGIONS.find(
          r =>
            stateLow.includes(r.name.toLowerCase().replace(' viloyati', '').replace(' respublikasi', '')) ||
            r.name.toLowerCase().includes(stateLow)
        );
        if (foundReg) {
          setFormViloyat(foundReg.name);
          if (addressInfo.city) {
            const cityLow = addressInfo.city.toLowerCase();
            const foundDist = foundReg.districts.find(
              d =>
                cityLow.includes(d.name.toLowerCase().replace(' tumani', '').replace(' shahri', '')) ||
                d.name.toLowerCase().includes(cityLow)
            );
            if (foundDist) {
              setFormTuman(foundDist.name);
            }
          }
        }
      }
      if (addressInfo.street) {
        setFormMahalla(addressInfo.street);
      }
    }
  };

  // Rasm fayl yuklash (Avtomatik siqish bilan)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const compressedBase64 = await compressImageFile(file);
        setFormRasmlar(prev => [...prev, compressedBase64]);
      } catch (err) {
        console.error('Rasm yuklashda xatolik:', err);
      }
    }
  };

  const handleAddImageUrl = () => {
    if (formImageUrl.trim()) {
      setFormRasmlar(prev => [...prev, formImageUrl.trim()]);
      setFormImageUrl('');
    }
  };

  // Admin tomonidan e'lonni to'g'ridan-to'g'ri faol qilib joylash
  const handleAdminCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formViloyat) {
      setFormError('Viloyatni tanlang');
      return;
    }
    if (!formNarx || Number(formNarx) <= 0) {
      setFormError('Narxni to\'g\'ri kiriting');
      return;
    }
    if (formRasmlar.length === 0) {
      setFormError('Kamida 1 ta rasm kiriting');
      return;
    }

    setFormLoading(true);
    const shahar = formViloyat && formTuman ? `${formViloyat}, ${formTuman}` : (formViloyat || formTuman);
    const manzilMatn = formMahalla.trim() ? `${formTuman}, ${formMahalla.trim()}` : (formTuman || formViloyat);

    try {
      const newListing = await createListing({
        user_id: 'admin',
        turi: formTuri,
        shahar,
        viloyat: formViloyat,
        tuman: formTuman,
        mahalla: formMahalla,
        manzil_matn: manzilMatn,
        manzil_lat: formLat,
        manzil_lng: formLng,
        xonalar_soni: Number(formXonalar),
        maydon: Number(formMaydon),
        qavat: Number(formQavat) || 1,
        umumiy_qavat: Number(formUmumiyQavat) || 1,
        narx: Number(formNarx),
        valyuta: formValyuta,
        telefon: formTelefon,
        izoh: formIzoh,
        rasmlar: formRasmlar,
        holat: 'faol', // To'g'ridan-to'g'ri hech qanday ruxsatsiz faol holatda saqlanadi!
        is_vip: formIsVip, // VIP yoki oddiy
        tamiri: formTamiri,
        bino_turi: formBinoTuri,
        mebel: formMebel,
        texnika: formTexnika
      });

      setListings(prev => [newListing, ...prev]);
      setIsAddModalOpen(false);
      alert(`✅ E'lon muvaffaqiyatli ${formIsVip ? 'VIP e\'lon' : 'oddiy e\'lon'} sifatida to'g'ridan-to'g'ri joylandi!`);
    } catch (err: any) {
      setFormError(err.message || 'E\'lonni yaratishda xatolik yuz berdi');
    } finally {
      setFormLoading(false);
    }
  };

  // Filtrlash
  const filteredListings = listings.filter(item => {
    if (filterStatus === 'vip') {
      if (!item.is_vip) return false;
    } else if (filterStatus === 'edit_requested') {
      if (!item.edit_requested) return false;
    } else if (filterStatus !== 'barchasi' && item.holat !== filterStatus) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        item.shahar.toLowerCase().includes(q) ||
        item.manzil_matn.toLowerCase().includes(q) ||
        item.telefon.includes(q) ||
        item.id.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Sarlavha & Yangi e'lon tugmasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">E'lonlar Boshqaruvi</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Saytdagi barcha e'lonlarni boshqarish, yangi VIP yoki oddiy e'lonlarni to'g'ridan-to'g'ri joylashtirish.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Ruxsatlarsiz to'g'ridan-to'g'ri VIP yoki Oddiy e'lon qo'shish */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yangi E'lon Joylash (VIP / Oddiy)</span>
          </button>

          <button
            onClick={loadListings}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            Yangilash
          </button>
        </div>
      </div>

      {/* Filtrlar & Qidiruv */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Status filtrlari */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'barchasi', label: 'Barchasi', count: listings.length },
            { id: 'vip', label: '⭐ VIP E\'lonlar', count: listings.filter(l => l.is_vip).length },
            { id: 'kutilmoqda', label: '⏳ Kutilmoqda', count: listings.filter(l => l.holat === 'kutilmoqda').length },
            { id: 'faol', label: '✅ Faol', count: listings.filter(l => l.holat === 'faol').length },
            { id: 'edit_requested', label: '✏️ Tahrir so\'rovi', count: listings.filter(l => l.edit_requested && !l.can_edit).length },
            { id: 'rad_etildi', label: '❌ Rad etilgan', count: listings.filter(l => l.holat === 'rad_etildi').length },
            { id: 'sotilgan', label: '🔒 Sotilganlar', count: listings.filter(l => l.holat === 'sotilgan').length },
            { id: 'nobakor', label: '🗑️ O\'chirilganlar', count: listings.filter(l => l.holat === 'nobakor').length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === f.id
                  ? 'bg-brand-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Qidiruv */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-brand-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Shahar, manzil yoki telefon..."
            className="w-full pl-10 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded transition-colors"
              title="Tozalash"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* E'lonlar Jadvali */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Yuklanmoqda...</div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Ushbu filtr bo'yicha e'lonlar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Rasm & Manzil</th>
                  <th className="px-5 py-4">Daraja (VIP)</th>
                  <th className="px-5 py-4">Turi / Xonalar</th>
                  <th className="px-5 py-4">Narxi</th>
                  <th className="px-5 py-4">Telefon</th>
                  <th className="px-5 py-4">Holat</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredListings.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.rasmlar[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=150&q=80'}
                          alt={item.manzil_matn}
                          width={48}
                          height={40}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-10 object-cover rounded-xl border border-slate-700 shrink-0"
                        />
                        <div className="truncate max-w-[200px]">
                          <div className="font-bold text-white truncate">{item.shahar}, {item.manzil_matn}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {item.id}</div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.vip_requested && !item.is_vip && (
                              <span className="inline-block px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded animate-pulse">
                                ⭐ VIP so'ralgan
                              </span>
                            )}
                            {item.edit_requested && !item.can_edit && (
                              <span className="inline-block px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] font-bold rounded">
                                ✏️ Tahrir so'ralgan
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* VIP Holati va Tezkor O'zgartirish */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleVip(item.id, Boolean(item.is_vip))}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                          item.is_vip
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                        }`}
                        title="VIP / Oddiy qilib o'zgartirish"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{item.is_vip ? '★ VIP E\'lon' : 'Oddiy'}</span>
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-200">
                        {item.turi === 'sotuv' ? 'Sotuv' : 'Ijara'}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.xonalar_soni} xona • {item.maydon} m²</div>
                    </td>

                    <td className="px-5 py-4 font-bold text-emerald-400">
                      {item.narx?.toLocaleString()} {item.valyuta}
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-300">
                      {item.telefon}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          item.holat === 'faol'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.holat === 'rad_etildi'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : item.holat === 'sotilgan'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : item.holat === 'nobakor'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.holat === 'nobakor' ? 'O\'chirilgan' : item.holat}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedListing(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="Batafsil ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Tahrirlash so'roviga 1 marta ruxsat berish */}
                        {item.edit_requested && !item.can_edit && (
                          <button
                            onClick={() => handleAllowEdit(item.id)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-lg text-[10px] transition-colors flex items-center gap-1"
                            title="1 marta tahrirlashga ruxsat berish"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Tahrirga ruxsat</span>
                          </button>
                        )}

                        {item.holat !== 'faol' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'faol')}
                            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-colors"
                            title="Tasdiqlash (Faol qilish)"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        {item.holat !== 'rad_etildi' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'rad_etildi')}
                            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 rounded-lg transition-colors"
                            title="Rad etish"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                          title="Bazadan butunlay o'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADMIN TOMONIDAN E'LON QO'SHISH MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative text-white space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold mb-2">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Admin Tezkor E'lon</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                To'g'ridan-to'g'ri E'lon Joylash (Ruxsatsiz & Faol)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ushbu e'lon hech qanday moderator tasdig'isiz darhol saytda faol ko'rinadi.
              </p>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdminCreateListing} className="space-y-6">
              {/* 1. E'lon turi & VIP darajasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    E'lon Turi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTuri('sotuv')}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                        formTuri === 'sotuv'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Sotuv
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTuri('ijara')}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                        formTuri === 'ijara'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Ijara
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    E'lon Darajasi (VIP yoki Oddiy)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormIsVip(!formIsVip)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      formIsVip
                        ? 'bg-amber-500 text-amber-950 border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{formIsVip ? '⭐ VIP E\'lon (Bosh sahifada birinchi chiqadi)' : 'Oddiy E\'lon'}</span>
                  </button>
                </div>
              </div>

              {/* 2. Manzil (3 ta maydon) */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Joylashuv va Manzil
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">1. Viloyat</label>
                    <select
                      value={formViloyat}
                      onChange={(e) => handleFormViloyatChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      {UZBEKISTAN_REGIONS.map(r => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">2. Tuman / Shahar</label>
                    {(() => {
                      const reg = UZBEKISTAN_REGIONS.find(r => r.name === formViloyat);
                      const districts = reg ? reg.districts : [];
                      return districts.length > 0 ? (
                        <select
                          value={formTuman}
                          onChange={(e) => handleFormTumanChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        >
                          {districts.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formTuman}
                          onChange={(e) => setFormTuman(e.target.value)}
                          placeholder="Tuman nomi"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">3. Mahalla / Ko'cha / Uy</label>
                    <input
                      type="text"
                      value={formMahalla}
                      onChange={(e) => setFormMahalla(e.target.value)}
                      placeholder="Navoiy ko'chasi 15-uy"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <MapPicker
                    lat={formLat}
                    lng={formLng}
                    onLocationChange={handleFormLocationChange}
                  />
                </div>
              </div>

              {/* 3. Mulk parametrlari */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Xonalar soni</label>
                  <input
                    type="number"
                    min="1"
                    value={formXonalar}
                    onChange={(e) => setFormXonalar(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Maydoni (m²)</label>
                  <input
                    type="number"
                    value={formMaydon}
                    onChange={(e) => setFormMaydon(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Qavat</label>
                  <input
                    type="number"
                    value={formQavat}
                    onChange={(e) => setFormQavat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Umumiy qavat</label>
                  <input
                    type="number"
                    value={formUmumiyQavat}
                    onChange={(e) => setFormUmumiyQavat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Narx & Telefon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Narx va Valyuta</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      value={formNarx}
                      onChange={(e) => setFormNarx(Number(e.target.value))}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none font-bold"
                    />
                    <select
                      value={formValyuta}
                      onChange={(e) => setFormValyuta(e.target.value as any)}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white font-bold"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="UZS">UZS (so'm)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bog'lanish telefoni</label>
                  <input
                    type="text"
                    required
                    value={formTelefon}
                    onChange={(e) => setFormTelefon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 5. Qo'shimcha qulayliklar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Ta'miri</label>
                  <select
                    value={formTamiri}
                    onChange={(e) => setFormTamiri(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    <option value="Yevro ta'mir">Yevro ta'mir</option>
                    <option value="O'rtacha">O'rtacha</option>
                    <option value="Ta'mirsiz">Ta'mirsiz</option>
                    <option value="Mualliflik loyihasi">Mualliflik</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bino turi</label>
                  <select
                    value={formBinoTuri}
                    onChange={(e) => setFormBinoTuri(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    <option value="G'ishtli">G'ishtli</option>
                    <option value="Monolit">Monolit</option>
                    <option value="Panelli">Panelli</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="adminMebel"
                    checked={formMebel}
                    onChange={(e) => setFormMebel(e.target.checked)}
                    className="rounded text-brand-600 w-4 h-4 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="adminMebel" className="text-xs text-slate-300 cursor-pointer">Mebel bor</label>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="adminTexnika"
                    checked={formTexnika}
                    onChange={(e) => setFormTexnika(e.target.checked)}
                    className="rounded text-brand-600 w-4 h-4 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="adminTexnika" className="text-xs text-slate-300 cursor-pointer">Texnika bor</label>
                </div>
              </div>

              {/* 6. Rasmlar */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Rasmlar ({formRasmlar.length} ta yuklangan)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Rasm URL havolasini kiriting..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Qo'shish
                  </button>
                  <label className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Fayl</span>
                    <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {formRasmlar.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {formRasmlar.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-700 shrink-0 group">
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          width={80}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormRasmlar(prev => prev.filter((_, i) => i !== idx))}
                          aria-label={`Rasm ${idx + 1}ni o'chirish`}
                          className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Izoh */}
              <div>
                <label htmlFor="admin-listing-izoh" className="block text-[11px] text-slate-400 mb-1">Izoh / Tavsif</label>
                <textarea
                  id="admin-listing-izoh"
                  rows={3}
                  value={formIzoh}
                  onChange={(e) => setFormIzoh(e.target.value)}
                  placeholder="E'lon haqida batafsil ma'lumot..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Tugmalar */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{formLoading ? 'Saqlanmoqda...' : 'Darhol Saytga Joylash (Faol)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E'lon tafsilotlarini ko'rish modali */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-white space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedListing(null)}
              aria-label="Modalni yopish"
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-brand-500/20 text-brand-400 text-xs font-bold rounded uppercase">
                  {selectedListing.turi === 'sotuv' ? 'Sotuv e\'loni' : 'Ijara e\'loni'}
                </span>
                {selectedListing.is_vip && (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> VIP
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">
                {selectedListing.shahar}, {selectedListing.manzil_matn}
              </h2>
              <p className="text-xs text-slate-400 mt-1">E'lon ID: {selectedListing.id}</p>
            </div>

            {/* Rasmlar */}
            {selectedListing.rasmlar?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedListing.rasmlar.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Listing preview ${idx + 1}`}
                    width={200}
                    height={112}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-28 object-cover rounded-xl border border-slate-800"
                  />
                ))}
              </div>
            )}

            {/* Asosiy parametrlar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Narxi</span>
                <span className="text-sm font-black text-emerald-400">{selectedListing.narx?.toLocaleString()} {selectedListing.valyuta}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Xonalar</span>
                <span className="text-sm font-bold text-white">{selectedListing.xonalar_soni} xona</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Maydon</span>
                <span className="text-sm font-bold text-white">{selectedListing.maydon} m²</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Qavat</span>
                <span className="text-sm font-bold text-white">{selectedListing.qavat}/{selectedListing.umumiy_qavat}</span>
              </div>
            </div>

            {/* Telefon & Izoh */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-brand-400" />
                <span>Telefon: <strong className="text-white font-mono">{selectedListing.telefon}</strong></span>
              </div>

              {selectedListing.izoh && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Tavsif:</span>
                  {selectedListing.izoh}
                </div>
              )}
            </div>

            {/* Amallar */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800 justify-end">
              <button
                type="button"
                onClick={() => handleToggleVip(selectedListing.id, Boolean(selectedListing.is_vip))}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedListing.is_vip
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{selectedListing.is_vip ? 'VIP o\'chirish' : 'VIP qilish'}</span>
              </button>

              {selectedListing.holat !== 'faol' && (
                <button
                  onClick={() => handleStatusChange(selectedListing.id, 'faol')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Faol qilish (Tasdiqlash)</span>
                </button>
              )}

              {selectedListing.holat !== 'rad_etildi' && (
                <button
                  onClick={() => handleStatusChange(selectedListing.id, 'rad_etildi')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Rad etish</span>
                </button>
              )}

              <button
                onClick={() => handleDelete(selectedListing.id)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>O'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
