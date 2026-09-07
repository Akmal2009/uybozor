import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterState, Listing } from '../types';
import { fetchListings } from '../services/listingService';
import { FilterBar } from '../components/FilterBar';
import { ListingCard } from '../components/ListingCard';
import { Building2, Sparkles, TrendingUp, ShieldCheck, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Og'ir Map komponentini asinxron (lazy) yuklash — Render-blockingni yo'qotadi
const MapListingView = lazy(() =>
  import('../components/MapListingView').then(m => ({ default: m.MapListingView }))
);

export const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('turi');
  const cityParam = searchParams.get('shahar');

  const [filters, setFilters] = useState<FilterState>({
    turi: (typeParam as any) || 'barchasi',
    shahar: cityParam || 'Barchasi',
    xonalar_soni: 'barchasi',
    minNarx: undefined,
    maxNarx: undefined,
    minMaydon: undefined,
    maxMaydon: undefined,
    searchQuery: '',
    sortBy: 'yangi'
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    if (typeParam) {
      setFilters(prev => ({ ...prev, turi: typeParam as any }));
    }
    if (cityParam) {
      setFilters(prev => ({ ...prev, shahar: cityParam }));
    }
  }, [typeParam, cityParam]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await fetchListings(filters);
      setListings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [filters]);

  const vipListings = listings.filter(l => l.is_vip);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Orqa fon bezagi */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-brand-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>O'zbekistonda 10,000+ dan ortiq faol e'lonlar</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            Orzuingizdagi uyni <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300">oson va tez</span> toping
          </h1>

          <p className="text-sm sm:text-base text-brand-100 max-w-2xl mx-auto">
            Toshkent, Samarqand, Buxoro va barcha viloyatlar bo'yicha uylar, kvartiralar va tijorat maydonlari. To'g'ridan-to'g'ri egalaridan vositachisiz e'lonlar.
          </p>

          {/* Tezkor statistika */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl font-extrabold text-white">5,400+</div>
              <div className="text-xs text-brand-200">Sotuvdagi uylar</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl font-extrabold text-white">2,800+</div>
              <div className="text-xs text-brand-200">Ijaradagi uylar</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl font-extrabold text-white">100%</div>
              <div className="text-xs text-brand-200">Tekshirilgan e'lonlar</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl font-extrabold text-white">0%</div>
              <div className="text-xs text-brand-200">Ortiqcha komissiyasiz</div>
            </div>
          </div>
        </div>
      </section>

      {/* Asosiy Kontent & Filtrlar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={listings.length}
        />

        {/* VIP E'lonlar Tavsiyasi (faqat barchasi ko'rinishida) */}
        {vipListings.length > 0 && filters.searchQuery === '' && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">VIP Tavsiya etilgan e'lonlar</h2>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Premium
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vipListings.map((item, idx) => (
                <ListingCard
                  key={`vip-${item.id}`}
                  listing={item}
                  priority={idx < 2}
                />
              ))}
            </div>
          </section>
        )}

        {/* Barcha e'lonlar sarlavhasi */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {filters.turi === 'sotuv'
                ? 'Sotiladigan ko\'chmas mulklar'
                : filters.turi === 'ijara'
                ? 'Ijaraga beriladigan uylar'
                : 'Barcha ko\'chmas mulk e\'lonlari'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {filters.shahar !== 'Barchasi' ? `${filters.shahar} shahri bo'yicha` : 'O\'zbekiston bo\'ylab'} {listings.length} ta e'lon
            </p>
          </div>
        </div>

        {/* Yuklanmoqda (CLS-nol skeletlari) yoki E'lonlar ko'rinishi */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
                {/* Tayanch aspect-[16/9] rasm o'rni */}
                <div className="aspect-[16/9] w-full bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded-lg w-1/2" />
                  <div className="h-4 bg-gray-200 rounded-md w-3/4" />
                  <div className="h-10 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-4">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">Ushbu parametrlar bo'yicha e'lonlar topilmadi</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Iltimos, filtrlarni o'zgartirib ko'ring yoki birinchi bo'lib ushbu hudud bo'yicha o'z e'loningizni qoldiring.
            </p>
            <Link
              to="/create-listing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              E'lon joylash
            </Link>
          </div>
        ) : viewMode === 'map' ? (
          <Suspense
            fallback={
              <div className="w-full h-[600px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center text-gray-400 font-medium">
                Xarita yuklanmoqda...
              </div>
            }
          >
            <MapListingView listings={listings} />
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item, idx) => (
              <ListingCard
                key={item.id}
                listing={item}
                priority={vipListings.length === 0 && idx < 2}
              />
            ))}
          </div>
        )}

        {/* CTA Banner */}
        <section className="mt-16 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold uppercase tracking-wider">
              Tez va qulay
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              Uyingizni tezroq sotmoqchimisiz yoki ijaraga bermoqchimisiz?
            </h3>
            <p className="text-sm text-emerald-100 max-w-xl">
              Bepul e'lon joylang va har kuni 50,000 dan ortiq xaridor va ijarachilar e'tiborini torting.
            </p>
          </div>
          <Link
            to="/create-listing"
            className="px-6 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-bold text-sm shadow-lg hover:scale-105 transition-all shrink-0"
          >
            E'lonni bepul joylash
          </Link>
        </section>
      </main>
    </div>
  );
};
