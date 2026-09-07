import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { fetchAllAdminPayments } from '../services/adminService';
import {
  Receipt,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  DollarSign,
  X
} from 'lucide-react';

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAdminPayments();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const totalSum = payments.reduce((sum, p) => sum + (p.summa || 0), 0);

  const filteredPayments = payments.filter(p => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.listing_title && p.listing_title.toLowerCase().includes(q)) ||
      (p.transaction_id && p.transaction_id.toLowerCase().includes(q)) ||
      p.tolov_provayderi.toLowerCase().includes(q) ||
      p.id.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">To'lovlar Tarixi</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Platformada amalga oshirilgan barcha to'lovlar, VIP xizmatlar va tranzaksiyalar.
          </p>
        </div>

        <button
          onClick={loadPayments}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
        >
          Yangilash
        </button>
      </div>

      {/* Jami tushum kartasi va Qidiruv */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">Jami Tushum</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {totalSum.toLocaleString()} <span className="text-xs">UZS</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">Jami Tranzaksiyalar</div>
            <div className="text-2xl font-black text-white mt-1">
              {payments.length} <span className="text-xs text-slate-400">ta</span>
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-brand-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tranzaksiya ID yoki xizmat nomi..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
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
      </div>

      {/* To'lovlar Jadvali */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Yuklanmoqda...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            To'lovlar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Sana / Vaqt</th>
                  <th className="px-5 py-4">Xizmat / E'lon</th>
                  <th className="px-5 py-4">To'lov Tizimi</th>
                  <th className="px-5 py-4">Tranzaksiya ID</th>
                  <th className="px-5 py-4">Summa</th>
                  <th className="px-5 py-4 text-right">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 font-mono text-slate-400">
                      {new Date(p.sana).toLocaleDateString('uz-UZ')} {new Date(p.sana).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="px-5 py-4 font-bold text-white">
                      {p.listing_title || 'VIP E\'lon xizmati'}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        p.tolov_provayderi === 'Payme'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {p.tolov_provayderi}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {p.transaction_id || p.id}
                    </td>

                    <td className="px-5 py-4 font-extrabold text-emerald-400 text-sm">
                      {p.summa?.toLocaleString()} UZS
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" /> To'langan
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
