import React from 'react';
import { Link } from 'react-router-dom';
import { Listing } from '../types';
import { Heart, MapPin, Bed, Layers, Maximize2, Phone, Sparkles, Eye } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

interface ListingCardProps {
  listing: Listing;
  priority?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, priority = false }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(listing.id);

  const formattedPrice = listing.valyuta === 'USD' 
    ? `$${listing.narx.toLocaleString()}` 
    : `${listing.narx.toLocaleString()} UZS`;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Rasm qismi — CLS oldini olish uchun qat'iy aspect-[16/9] va bg-gray-200 */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-200">
        <Link to={`/listing/${listing.id}`} aria-label={`${listing.shahar}, ${listing.manzil_matn} e'lonini ko'rish`}>
          <img
            src={listing.rasmlar[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'}
            alt={listing.manzil_matn}
            width={400}
            height={225}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="w-full h-full object-cover aspect-[16/9] transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
            listing.turi === 'sotuv' ? 'bg-emerald-700' : 'bg-blue-700'
          }`}>
            {listing.turi === 'sotuv' ? 'Sotuv' : 'Ijara'}
          </span>
          {listing.is_vip && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-yellow-400 flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 fill-amber-700 text-amber-800" />
              VIP
            </span>
          )}
          {listing.holat === 'sotilgan' && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-red-700 shadow-sm">
              Sotilgan
            </span>
          )}
        </div>

        {/* Sevimlilarga qo'shish */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(listing.id);
          }}
          aria-label={favorite ? "Saralanganlardan o'chirish" : "Saralanganlarga qo'shish"}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/95 backdrop-blur hover:bg-white text-gray-800 hover:text-red-600 transition-all shadow-md z-10"
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Rasmlar soni & ko'rishlar */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[11px] font-medium text-white bg-black/75 backdrop-blur px-2 py-0.5 rounded-md">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {listing.views_count || 1}
          </span>
          <span>•</span>
          <span>{listing.rasmlar.length || 1} rasm</span>
        </div>
      </div>

      {/* Kontent qismi */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Narx */}
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xl font-extrabold text-brand-800">
              {formattedPrice}
              {listing.turi === 'ijara' && (
                <span className="text-xs font-normal text-gray-600"> /oy</span>
              )}
            </span>
            <span className="text-xs font-semibold text-gray-600">
              {listing.valyuta === 'USD' 
                ? `$${Math.round(listing.narx / (listing.maydon || 1)).toLocaleString()}/m²` 
                : `${Math.round(listing.narx / (listing.maydon || 1)).toLocaleString()} UZS/m²`}
            </span>
          </div>

          {/* Manzil */}
          <div className="flex items-start gap-1.5 text-gray-700 text-xs mb-3 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
            <span className="font-semibold text-gray-900">{listing.shahar},</span>
            <span className="truncate">{listing.manzil_matn}</span>
          </div>

          {/* Xususiyatlar */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-gray-50 rounded-xl text-xs text-gray-700 border border-gray-100 mb-3">
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="font-semibold">{listing.xonalar_soni}</span>
              <span className="text-gray-500 text-[11px]">xona</span>
            </div>
            <div className="flex items-center gap-1.5 border-x border-gray-200 px-2">
              <Maximize2 className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="font-semibold">{listing.maydon}</span>
              <span className="text-gray-500 text-[11px]">m²</span>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <Layers className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="font-semibold">{listing.qavat}/{listing.umumiy_qavat}</span>
              <span className="text-gray-500 text-[11px]">qav.</span>
            </div>
          </div>
        </div>

        {/* Pastki tugma */}
        <div className="pt-2 border-t border-gray-100">
          <Link
            to={`/listing/${listing.id}`}
            className="w-full py-2.5 text-center text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors block"
          >
            Batafsil ma'lumot
          </Link>
        </div>
      </div>
    </div>
  );
};
