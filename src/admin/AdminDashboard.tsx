import React, { useState, useEffect } from 'react';
import { fetchAdminStats } from '../services/adminService';
import {
  Home,
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateListings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateListings }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-36 bg-slate-900 rounded-3xl border border-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Boshqaruv Statistikasi</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Saytdagi barcha e'lonlar, VIP takliflar va foydalanuvchilar ko'rsatkichlari.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
        >
          Yangilash
        </button>
      </div>

      {/* 5 ta Asosiy Kartalar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Jami e'lonlar */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Jami e'lonlar</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalListings || 0}</div>
          <div className="text-[11px] text-slate-500 font-medium">Barcha kiritilgan e'lonlar</div>
        </div>

        {/* 2. ⭐ VIP E'lonlar */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              ⭐ VIP E'lonlar
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{stats?.vipListings || 0}</div>
          <div className="text-[11px] text-amber-300/60 font-medium">Yuqori o'rindagi e'lonlar</div>
        </div>

        {/* 3. Faol e'lonlar */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Faol e'lonlar</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats?.activeListings || 0}</div>
          <div className="text-[11px] text-slate-500 font-medium">Saytda faol ko'rinayotganlar</div>
        </div>

        {/* 4. Kutilmoqda */}
        <div
          onClick={onNavigateListings}
          className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-5 space-y-3 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              Kutilmoqda
              {stats?.pendingListings > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{stats?.pendingListings || 0}</div>
          <div className="text-[11px] text-amber-300/60 font-medium">Tasdiqlash kutilayotganlar</div>
        </div>

        {/* 5. Foydalanuvchilar */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400">Foydalanuvchilar</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalUsers || 0}</div>
          <div className="text-[11px] text-slate-500 font-medium">
            {stats?.blockedUsers > 0 ? `${stats.blockedUsers} ta bloklangan` : 'Barchasi faol'}
          </div>
        </div>
      </div>

      {/* Kutilayotgan e'lonlar tezkor ro'yxati */}
      {stats?.pendingListings > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>Diqqat! {stats.pendingListings} ta yangi e'lon admin tasdig'ini kutmoqda!</span>
            </div>
            <button
              onClick={onNavigateListings}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>E'lonlarni ko'rish</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* So'nggi e'lonlar va VIP e'lonlar jadvali */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* So'nggi e'lonlar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Home className="w-4 h-4 text-brand-400" />
              So'nggi e'lonlar
            </h3>
            <button
              onClick={onNavigateListings}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              Barchasini ko'rish &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentListings?.map((l: any) => (
              <div
                key={l.id}
                className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={l.rasmlar[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=150&q=80'}
                    alt={l.manzil_matn}
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 object-cover rounded-xl shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-bold text-white truncate flex items-center gap-1.5">
                      {l.is_vip && <span className="text-amber-400 font-black">★ VIP</span>}
                      {l.shahar}, {l.manzil_matn}
                    </div>
                    <div className="text-slate-400 text-[11px]">{l.xonalar_soni} xona • {l.narx?.toLocaleString()} {l.valyuta}</div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0 ${
                    l.holat === 'faol'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : l.holat === 'rad_etildi'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {l.holat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* VIP E'lonlar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              VIP E'lonlar ({stats?.vipListings || 0} ta)
            </h3>
            <button
              onClick={onNavigateListings}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              Barchasini ko'rish &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentVipListings?.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">Hozircha VIP e'lonlar mavjud emas</div>
            ) : (
              stats?.recentVipListings?.map((l: any) => (
                <div
                  key={l.id}
                  className="p-3 bg-slate-950/60 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={l.rasmlar[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=150&q=80'}
                      alt={l.manzil_matn}
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 object-cover rounded-xl shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-bold text-amber-300 truncate">★ {l.shahar}, {l.manzil_matn}</div>
                      <div className="text-slate-400 text-[11px]">{l.xonalar_soni} xona • {l.narx?.toLocaleString()} {l.valyuta}</div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30 shrink-0">
                    VIP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
