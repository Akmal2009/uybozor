import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { fetchListingById, fetchListings, incrementViewCount, updateListing } from '../services/listingService';
import { requestVipPermission } from '../services/telegramService';
import { getOptimizedImageUrl } from '../services/imageUtils';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Bed,
  Layers,
  Maximize2,
  Phone,
  Send,
  Heart,
  Share2,
  Calendar,
  Eye,
  Sparkles,
  CheckCircle,
  Building,
  Wrench,
  Armchair,
  Tv,
  ArrowLeft,
  Calculator,
  ShieldCheck,
  Edit3,
  Clock
} from 'lucide-react';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipRequestedLocal, setVipRequestedLocal] = useState(false);

  // Ipoteka kalkulyatori hisoblari
  const [initialPaymentPercent, setInitialPaymentPercent] = useState(25);
  const [loanYears, setLoanYears] = useState(15);
  const [interestRate, setInterestRate] = useState(17); // 17% yillik

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchListingById(id).then(data => {
        if (data) {
          setListing(data);
          setSelectedImage(data.rasmlar[0] || '');
          incrementViewCount(data.id);

          // O'xshash e'lonlarni olish
          fetchListings({ turi: data.turi, shahar: data.shahar }).then(list => {
            setSimilarListings(list.filter(item => item.id !== data.id).slice(0, 3));
          });
        }
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse">
        <div className="h-96 bg-gray-200 rounded-3xl max-w-4xl mx-auto mb-6" />
        <div className="h-8 bg-gray-200 rounded max-w-md mx-auto mb-3" />
        <div className="h-4 bg-gray-200 rounded max-w-sm mx-auto" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">E'lon topilmadi yoki o'chirilgan</h2>
        <p className="text-gray-500 text-sm">Qidirayotgan e'loningiz mavjud emas yoki muddati tugagan bo'lishi mumkin.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  const favorite = isFavorite(listing.id);
  const isOwner = user && user.id === listing.user_id;

  const formattedPrice = listing.valyuta === 'USD' 
    ? `$${listing.narx.toLocaleString()}` 
    : `${listing.narx.toLocaleString()} UZS`;

  const pricePerM2 = Math.round(listing.narx / (listing.maydon || 1));

  // Ipoteka hisoblash
  const propertyPrice = listing.valyuta === 'USD' ? listing.narx * 12700 : listing.narx; // So'mda
  const initialPayment = (propertyPrice * initialPaymentPercent) / 100;
  const loanAmount = propertyPrice - initialPayment;
  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = loanYears * 12;
  const monthlyPayment = loanAmount > 0 
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
    : 0;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestVip = async () => {
    if (!listing || listing.is_vip || listing.vip_requested || vipRequestedLocal) return;
    setVipLoading(true);
    try {
      await requestVipPermission(listing.id);
      await updateListing(listing.id, { vip_requested: true });
      setVipRequestedLocal(true);
      setListing(prev => (prev ? { ...prev, vip_requested: true } : null));
      alert('⭐ VIP maqomi so\'rovi adminga yuborildi! Admin tasdiqlashi bilan e\'loningiz VIP bo\'ladi.');
    } catch (e) {
      alert('VIP so\'rovi yuborishda xatolik yuz berdi');
    } finally {
      setVipLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Yuqori navigatsiya */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white px-3.5 py-2 rounded-xl border border-gray-200 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>

        <div className="flex items-center gap-2">
          {/* E'lon egasi uchun VIP so'rovi */}
          {isOwner && !listing.is_vip && (
            <div>
              {listing.vip_requested || vipRequestedLocal ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  VIP so'rovi kutilmoqda
                </span>
              ) : (
                <button
                  type="button"
                  disabled={vipLoading}
                  onClick={handleRequestVip}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-amber-900" />
                  {vipLoading ? 'Yuborilmoqda...' : '⭐ VIP qilish'}
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <Link
              to={`/create-listing?edit=${listing.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
            >
              <Edit3 className="w-4 h-4 text-brand-600" />
              Tahrirlash
            </Link>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 text-xs font-bold transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Nusxa olindi!' : 'Ulashish'}
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(listing.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors shadow-sm ${
              favorite
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-gray-700 hover:text-red-600 border-gray-200'
            }`}
          >
            <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : ''}`} />
            {favorite ? 'Saqlangan' : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* E'lon holati banneri (agar faol bo'lmasa) */}
      {listing.holat !== 'faol' && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-3 ${
          listing.holat === 'kutilmoqda'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : listing.holat === 'rad_etildi'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-gray-100 border-gray-200 text-gray-700'
        }`}>
          <span className="text-lg">
            {listing.holat === 'kutilmoqda' ? '⏳' : listing.holat === 'rad_etildi' ? '❌' : '🔒'}
          </span>
          <div>
            <strong>E'lon holati: </strong>
            {listing.holat === 'kutilmoqda'
              ? 'Admin tasdig\'i kutilmoqda. Tasdiqlangach barchaga ko\'rinadi.'
              : listing.holat === 'rad_etildi'
              ? 'Ushbu e\'lon admin tomonidan rad etilgan.'
              : 'Ushbu e\'lon sotilgan / berilgan deb belgilangan.'}
          </div>
        </div>
      )}

      {/* Sarlavha va Narx */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider text-white ${
              listing.turi === 'sotuv' ? 'bg-emerald-600' : 'bg-blue-600'
            }`}>
              {listing.turi === 'sotuv' ? 'Sotuv' : 'Ijara'}
            </span>

            {listing.is_vip && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-yellow-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                VIP E'lon
              </span>
            )}

            {listing.holat === 'sotilgan' && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-red-600">
                Sotilgan / Ijaraga berilgan
              </span>
            )}

            <span className="text-xs text-gray-400 flex items-center gap-1 ml-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(listing.yaratilgan_sana).toLocaleDateString('uz-UZ')}
            </span>

            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {listing.views_count || 1} marta ko'rildi
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {listing.xonalar_soni} xonali xonadon, {listing.maydon} m², {listing.qavat}/{listing.umumiy_qavat}-qavat
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span>{listing.shahar}, {listing.manzil_matn}</span>
          </p>
        </div>

        {/* Narx qismi */}
        <div className="bg-brand-50/70 p-4 sm:p-5 rounded-2xl border border-brand-100 text-right min-w-[200px] w-full md:w-auto">
          <div className="text-3xl font-black text-brand-700">
            {formattedPrice}
            {listing.turi === 'ijara' && <span className="text-sm font-normal text-gray-500"> /oy</span>}
          </div>
          <div className="text-xs font-semibold text-brand-600 mt-1">
            {listing.valyuta === 'USD' 
              ? `$${pricePerM2.toLocaleString()} / m²` 
              : `${pricePerM2.toLocaleString()} UZS / m²`}
          </div>
        </div>
      </div>

      {/* Rasm Galereyasi */}
      <div className="space-y-4">
        {/* Asosiy katta rasm */}
        <div className="relative aspect-[16/9] md:aspect-[21/9] w-full rounded-3xl overflow-hidden bg-gray-900 shadow-md">
          <img
            src={getOptimizedImageUrl(selectedImage || listing.rasmlar[0], 1200)}
            alt={listing.manzil_matn}
            width={1200}
            height={675}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover transition-all duration-300"
          />
        </div>

        {/* Thumbnails */}
        {listing.rasmlar.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {listing.rasmlar.map((img, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Rasm ${idx + 1} ni kattalashtirib ko'rish`}
                onClick={() => setSelectedImage(img)}
                className={`relative w-28 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                  selectedImage === img
                    ? 'border-brand-600 ring-2 ring-brand-300 scale-105'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={getOptimizedImageUrl(img, 200)}
                  alt={`Ko'chmas mulk rasmi ${idx + 1}`}
                  width={112}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Asosiy ma'lumotlar va Sotuvchi paneli */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chap qism: Xususiyatlar va Tavsif */}
        <div className="lg:col-span-2 space-y-8">
          {/* Asosiy ko'rsatkichlar */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-6">Asosiy parametrlar</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">Xonalar</span>
                <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-brand-600" />
                  {listing.xonalar_soni} xona
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">Umumiy maydon</span>
                <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-brand-600" />
                  {listing.maydon} m²
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">Qavat</span>
                <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand-600" />
                  {listing.qavat} / {listing.umumiy_qavat}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">Bino turi</span>
                <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-brand-600" />
                  {listing.bino_turi || 'G\'ishtli'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Wrench className="w-5 h-5 text-brand-600 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Ta'miri</div>
                  <div className="text-xs font-bold text-gray-900">{listing.tamiri || 'Yevro ta\'mir'}</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Armchair className="w-5 h-5 text-brand-600 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Mebellar</div>
                  <div className="text-xs font-bold text-gray-900">{listing.mebel ? 'Mavjud' : 'Mavjud emas'}</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Tv className="w-5 h-5 text-brand-600 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Maishiy texnika</div>
                  <div className="text-xs font-bold text-gray-900">{listing.texnika ? 'Mavjud' : 'Mavjud emas'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Izoh / Tavsif */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-gray-900">E'lon haqida batafsil</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {listing.izoh || 'Qo\'shimcha ma\'lumotlar kiritilmagan. To\'liq ma\'lumot olish uchun sotuvchi bilan telefon orqali bog\'laning.'}
            </p>
          </div>

          {/* Xarita */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              Xaritadagi joylashuvi
            </h3>
            <p className="text-xs text-gray-500">{listing.shahar}, {listing.manzil_matn}</p>

            <div className="h-80 w-full rounded-2xl overflow-hidden border border-gray-200">
              <MapContainer
                center={[listing.manzil_lat, listing.manzil_lng]}
                zoom={14}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[listing.manzil_lat, listing.manzil_lng]} icon={markerIcon}>
                  <Popup>{listing.manzil_matn}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          {/* Ipoteka kalkulyatori */}
          {listing.turi === 'sotuv' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Ipoteka kalkulyatori</h3>
                  <p className="text-xs text-gray-500">Oylik to'lov va dastlabki badalni hisoblang</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="mortgage-initial-payment" className="block text-xs font-semibold text-gray-700 mb-1">
                    Dastlabki badal: <strong>{initialPaymentPercent}%</strong>
                  </label>
                  <input
                    id="mortgage-initial-payment"
                    type="range"
                    aria-label="Dastlabki badal foizi"
                    min="15"
                    max="80"
                    step="5"
                    value={initialPaymentPercent}
                    onChange={(e) => setInitialPaymentPercent(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                  <span className="text-xs font-bold text-gray-900">
                    {(initialPayment / 1000000).toFixed(1)} mln so'm
                  </span>
                </div>

                <div>
                  <label htmlFor="mortgage-loan-years" className="block text-xs font-semibold text-gray-700 mb-1">
                    Kredit muddati: <strong>{loanYears} yil</strong>
                  </label>
                  <input
                    id="mortgage-loan-years"
                    type="range"
                    aria-label="Kredit muddati yillarda"
                    min="5"
                    max="25"
                    step="1"
                    value={loanYears}
                    onChange={(e) => setLoanYears(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>

                <div>
                  <label htmlFor="mortgage-interest-rate" className="block text-xs font-semibold text-gray-700 mb-1">
                    Yillik foiz: <strong>{interestRate}%</strong>
                  </label>
                  <input
                    id="mortgage-interest-rate"
                    type="range"
                    aria-label="Kredit yillik foiz stavkasi"
                    min="12"
                    max="26"
                    step="1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-semibold block">Taxminiy oylik to'lov:</span>
                  <span className="text-xs text-emerald-600">Kredit summasi: {(loanAmount / 1000000).toFixed(1)} mln so'm</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700">
                  {(monthlyPayment / 1000000).toFixed(2)} mln so'm /oy
                </div>
              </div>
            </div>
          )}
        </div>

        {/* O'ng tomon: Sotuvchi bilan bog'lanish */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-gray-100 sticky top-28 space-y-6">
            <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 font-bold text-lg flex items-center justify-center border border-brand-200">
                {listing.telefon.slice(-2)}
              </div>
              <div>
                <div className="text-xs text-gray-400">E'lon egasi</div>
                <div className="text-sm font-bold text-gray-900">Mulk egasi / Agent</div>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Tekshirilgan sotuvchi
                </div>
              </div>
            </div>

            {/* Qo'ng'iroq qilish tugmasi */}
            <a
              href={`tel:${listing.telefon.replace(/\s+/g, '')}`}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 text-base"
            >
              <Phone className="w-5 h-5" />
              <span>{listing.telefon}</span>
            </a>

            {/* Telegram orqali yozish */}
            <a
              href={`https://t.me/${listing.telefon.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Telegram orqali yozish</span>
            </a>

            <div className="pt-2 text-xs text-gray-400 space-y-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                Xavfsiz bitim qoidalariga amal qiling
              </div>
              <p className="text-[11px] leading-relaxed">
                Hech qachon mulkni ko'rmasdan oldindan to'liq to'lov yoki karta ma'lumotlarini jo'natmang.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* O'xshash e'lonlar */}
      {similarListings.length > 0 && (
        <div className="pt-10 border-t border-gray-200 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">O'xshash takliflar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similarListings.map(item => (
              <ListingCard key={`sim-${item.id}`} listing={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
