import React, { useEffect, useState } from 'react';
import { useFavorites } from '../context/FavoritesContext';
import { Listing } from '../types';
import { fetchListings } from '../services/listingService';
import { ListingCard } from '../components/ListingCard';
import { Heart, ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FavoritesPage: React.FC = () => {
  const { favorites } = useFavorites();
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchListings().then(allListings => {
      const filtered = allListings.filter(item => favorites.includes(item.id));
      setFavoriteListings(filtered);
      setLoading(false);
    });
  }, [favorites]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            Saralangan e'lonlar
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Sizga yoqqan va saqlab qo'yilgan ko'chmas mulk takliflari ({favoriteListings.length} ta)
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 text-xs font-bold transition-colors shadow-sm"
        >
          <Home className="w-4 h-4" /> Barcha e'lonlar
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      ) : favoriteListings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
          <Heart className="w-16 h-16 text-gray-300 mx-auto" />
          <h3 className="text-xl font-bold text-gray-800">Hozircha saqlangan e'lonlar yo'q</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Yoqqan uy yoki kvartira e'lonlaridagi yurakcha (sevimlilar) belgisini bosib, ularni shu yerda saqlab borishingiz mumkin.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            E'lonlarni ko'rish
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteListings.map(item => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      )}
    </div>
  );
};
