import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { fetchUserListings, deleteListing, updateListing } from '../services/listingService';
import { requestEditPermission, requestVipPermission } from '../services/telegramService';
import { useAuth } from '../context/AuthContext';
import {
  ListOrdered,
  PlusCircle,
  Edit3,
  Trash2,
  Sparkles,
  Eye,
  CheckCircle,
  AlertCircle,
  Building2,
  Lock,
  Send,
  X,
  Clock,
  AlertTriangle
} from 'lucide-react';

export const MyListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [vipLoadingId, setVipLoadingId] = useState<string | null>(null);

  // Tahrirlash so'rovi modali holati
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<Listing | null>(null);
  const [editRequestLoading, setEditRequestLoading] = useState(false);
  const [editRequestSent, setEditRequestSent] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userListings = await fetchUserListings(user.id);
      setListings(userListings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <Building2 className="w-16 h-16 text-brand-600 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">Mening e'lonlarim</h2>
        <p className="text-sm text-gray-500">
          O'z e'lonlaringizni ko'rish va boshqarish uchun profilingizga kiring.
        </p>
        <button
          onClick={openAuthModal}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-sm font-bold shadow-md transition-colors"
        >
          Tizimga kirish
        </button>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Haqiqatan ham ushbu e\'lonni o\'chirmoqchimisiz? (Saytdan olib tashlanadi)')) {
      await updateListing(id, { holat: 'nobakor' });
      setListings(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleMarkAsSold = async (item: Listing) => {
    const isCurrentlySold = item.holat === 'sotilgan';
    const confirmMessage = isCurrentlySold
      ? 'E\'lonni qayta faollashtirmoqchimisiz?'
      : 'E\'lonni "SOTILDI / BERILDI" deb belgilamoqchimisiz? (Sayt ro\'yxatidan olinadi)';

    if (window.confirm(confirmMessage)) {
      const newStatus = isCurrentlySold ? 'faol' : 'sotilgan';
      await updateListing(item.id, { holat: newStatus });
      setListings(prev => prev.map(l => (l.id === item.id ? { ...l, holat: newStatus } : l)));
    }
  };

  // Tahrirlash tugmasi bosilganda
  const handleEditClick = (item: Listing) => {
    if (item.can_edit) {
      // Agar admin ruxsat bergan bo'lsa -> to'g'ridan-to'g'ri tahrirlash
      navigate(`/create-listing?edit=${item.id}`);
    } else {
      // Ruxsat yo'q bo'lsa -> Ruxsat so'rash modalini ochish
      setSelectedListingForEdit(item);
      setEditRequestSent(Boolean(item.edit_requested));
    }
  };

  // Adminga Telegram bot orqali tahrirlash so'rovi yuborish
  const handleSendEditRequest = async () => {
    if (!selectedListingForEdit) return;
    setEditRequestLoading(true);
    try {
      await requestEditPermission(selectedListingForEdit.id);
      setEditRequestSent(true);
      setListings(prev =>
        prev.map(l => (l.id === selectedListingForEdit.id ? { ...l, edit_requested: true } : l))
      );
    } catch (e) {
      alert('So\'rov yuborishda xatolik yuz berdi');
    } finally {
      setEditRequestLoading(false);
    }
  };

  // Adminga Telegram bot orqali VIP so'rovi yuborish
  const handleRequestVip = async (item: Listing) => {
    if (item.is_vip || item.vip_requested) return;
    setVipLoadingId(item.id);
    try {
      await requestVipPermission(item.id);
      await updateListing(item.id, { vip_requested: true });
      setListings(prev =>
        prev.map(l => (l.id === item.id ? { ...l, vip_requested: true } : l))
      );
      alert('⭐ VIP maqomi so\'rovi adminga yuborildi! Admin tasdiqlashi bilan e\'loningiz VIP bo\'ladi.');
    } catch (e) {
      alert('VIP so\'rovi yuborishda xatolik yuz berdi');
    } finally {
      setVipLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Sarlavha va Yangi e'lon tugmasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Mening E'lonlarim</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Foydalanuvchi: <strong>{user.ism}</strong> ({user.telefon}) • Jami e'lonlar: <strong>{listings.length} ta</strong>
          </p>
        </div>

        <Link
          to="/create-listing"
          className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Yangi e'lon qo'shish
        </Link>
      </div>

      {/* Kontent */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-3xl" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-lg font-bold text-gray-800">Sizda hali e'lonlar mavjud emas</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Birinchi e'loningizni hoziroq joylang va xaridorlarni toping!
          </p>
          <Link
            to="/create-listing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow"
          >
            <PlusCircle className="w-4 h-4" /> E'lon joylash
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Rasm va Holat */}
              <div className="relative aspect-[16/10] bg-gray-100">
                <img
                  src={item.rasmlar[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'}
                  alt={item.manzil_matn}
                  width={400}
                  height={250}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase text-white shadow-sm ${
                    item.turi === 'sotuv' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {item.turi === 'sotuv' ? 'Sotuv' : 'Ijara'}
                  </span>
                  {item.is_vip && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-950 bg-amber-300 flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 fill-amber-700 text-amber-700" /> VIP
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] text-white flex items-center gap-1 font-medium">
                  <Eye className="w-3.5 h-3.5" /> {item.views_count || 1} ko'rish
                </div>
              </div>

              {/* Kontent */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xl font-extrabold text-brand-700">
                    {item.valyuta === 'USD' ? `$${item.narx.toLocaleString()}` : `${item.narx.toLocaleString()} UZS`}
                    {item.turi === 'ijara' && <span className="text-xs text-gray-500 font-normal"> /oy</span>}
                  </div>

                  <h4 className="text-sm font-bold text-gray-800 mt-1 line-clamp-1">
                    {item.xonalar_soni} xona, {item.maydon} m², {item.shahar}
                  </h4>

                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.manzil_matn}</p>

                  {/* Statik Holat Ko'rsatkichi */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Holati:</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                        item.holat === 'faol'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.holat === 'rad_etildi'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : item.holat === 'sotilgan'
                          ? 'bg-gray-100 text-gray-700 border-gray-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.holat === 'faol'
                        ? '✅ Faol (Tasdiqlangan)'
                        : item.holat === 'rad_etildi'
                        ? '❌ Rad etilgan'
                        : item.holat === 'sotilgan'
                        ? '🔒 Sotildi / Berildi'
                        : '⏳ Kutilmoqda (Admin tasdig\'i)'}
                    </span>
                  </div>

                  {/* Tahrirlash ruxsat holati */}
                  {item.can_edit && (
                    <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Admin 1 marta tahrirlashga ruxsat berdi
                    </div>
                  )}
                  {!item.can_edit && item.edit_requested && (
                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Tahrirlash so'rovi adminga yuborilgan
                    </div>
                  )}
                </div>

                {/* Boshqaruv tugmalari */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {/* VIP Maqomi Tugmasi */}
                  {!item.is_vip && item.holat === 'faol' && (
                    <div>
                      {item.vip_requested ? (
                        <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          VIP so'rovi yuborilgan (Admin tekshiruvi kutilmoqda)
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={vipLoadingId === item.id}
                          onClick={() => handleRequestVip(item)}
                          className="w-full py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-amber-900" />
                          <span>{vipLoadingId === item.id ? 'So\'rov yuborilmoqda...' : '⭐ VIP maqomini olish (Admin so\'rovi)'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/listing/${item.id}`}
                      className="flex-1 py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Ko'rish
                    </Link>

                    {/* Sotildi deb belgilash tugmasi */}
                    <button
                      type="button"
                      onClick={() => handleMarkAsSold(item)}
                      aria-label={item.holat === 'sotilgan' ? "E'lonni qayta faollashtirish" : "E'lonni sotildi deb belgilash"}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                        item.holat === 'sotilgan'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title={item.holat === 'sotilgan' ? 'Qayta faollashtirish' : 'Sotildi / Berildi deb belgilash'}
                    >
                      {item.holat === 'sotilgan' ? '🔒 Sotilgan' : '🔒 Sotildi'}
                    </button>

                    {/* Tahrirlash tugmasi (Admin ruxsati bilan) */}
                    <button
                      type="button"
                      onClick={() => handleEditClick(item)}
                      aria-label={item.can_edit ? "E'lonni tahrirlash" : "E'lonni tahrirlash uchun ruxsat so'rash"}
                      className={`p-2 rounded-xl transition-colors ${
                        item.can_edit
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          : 'bg-brand-50 hover:bg-brand-100 text-brand-700'
                      }`}
                      title={item.can_edit ? 'Tahrirlash (Ruxsat bor)' : 'Tahrirlash uchun ruxsat so\'rash'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      aria-label="E'lonni o'chirish"
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tahrirlash ruxsati so'rash modali */}
      {selectedListingForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 space-y-5">
            <button
              onClick={() => setSelectedListingForEdit(null)}
              aria-label="Tahrirlash oynasini yopish"
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900">E'lonni tahrirlash</h3>
              <p className="text-xs text-gray-500">
                Xavfsizlik va aniqlikni ta'minlash uchun e'lonni tahrirlash faqat <strong>Admin ruxsati bilan 1 marta</strong> amalga oshiriladi.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
              <div className="font-bold text-gray-900">{selectedListingForEdit.shahar}, {selectedListingForEdit.manzil_matn}</div>
              <div className="text-gray-500">{selectedListingForEdit.xonalar_soni} xona • {selectedListingForEdit.maydon} m² • {selectedListingForEdit.narx.toLocaleString()} {selectedListingForEdit.valyuta}</div>
            </div>

            {editRequestSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-emerald-800">
                  Adminga tahrirlash so'rovi yuborildi!
                </div>
                <p className="text-[11px] text-emerald-700">
                  Admin Telegram bot orqali ruxsat berishi bilan ushbu e'lonni 1 marta tahrirlashingiz mumkin bo'ladi.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={editRequestLoading}
                onClick={handleSendEditRequest}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{editRequestLoading ? 'So\'rov yuborilmoqda...' : 'Adminga tahrirlash ruxsatini so\'rash'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
