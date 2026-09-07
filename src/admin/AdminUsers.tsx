import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  fetchAllAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  toggleUserBlock,
  toggleUserAdmin
} from '../services/adminService';
import {
  Users,
  Search,
  Edit,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  X,
  Check,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Mail,
  KeyRound
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<Array<User & { listings_count?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  // Tahrirlash modali holati
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAdminUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.ism);
    setEditPhone(u.telefon);
    setEditEmail(u.email || '');
    setEditPassword(u.parol || '123456');
    setEditIsAdmin(Boolean(u.is_admin));
    setEditIsBlocked(Boolean(u.is_blocked));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateAdminUser(editingUser.id, {
        ism: editName,
        telefon: editPhone,
        email: editEmail || undefined,
        parol: editPassword,
        is_admin: editIsAdmin,
        is_blocked: editIsBlocked
      });
      setEditingUser(null);
      await loadUsers();
    } catch (e) {
      alert('Foydalanuvchi ma\'lumotlarini saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (window.confirm(`Haqiqatan ham "${u.ism}" foydalanuvchisini butunlay o'chirmoqchimisiz?`)) {
      await deleteAdminUser(u.id);
      setUsers(prev => prev.filter(item => item.id !== u.id));
    }
  };

  const handleToggleBlock = async (u: User) => {
    const nextState = !u.is_blocked;
    await toggleUserBlock(u.id, nextState);
    setUsers(prev =>
      prev.map(item => (item.id === u.id ? { ...item, is_blocked: nextState } : item))
    );
  };

  const filteredUsers = users.filter(u => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      u.ism.toLowerCase().includes(q) ||
      u.telefon.includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.id.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Foydalanuvchilar Boshqaruvi</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Barcha foydalanuvchilar ma'lumotlari, login, parollari, tahrirlash va o'chirish.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
        >
          Yangilash
        </button>
      </div>

      {/* Qidiruv & Statistika */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 font-semibold">
          Jami foydalanuvchilar: <span className="text-white font-bold">{users.length}</span> ta
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-brand-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ism, telefon yoki email bo'yicha..."
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

      {/* Foydalanuvchilar Jadvali */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Yuklanmoqda...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Foydalanuvchilar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Foydalanuvchi</th>
                  <th className="px-5 py-4">Telefon (Login)</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Parol</th>
                  <th className="px-5 py-4">E'lonlar</th>
                  <th className="px-5 py-4">Holat</th>
                  <th className="px-5 py-4 text-right">Admin Amallari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.ism}`}
                          alt={u.ism}
                          width={36}
                          height={36}
                          loading="lazy"
                          decoding="async"
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {u.ism}
                            {u.is_admin && (
                              <span className="px-1.5 py-0.5 bg-brand-500/20 text-brand-400 text-[9px] font-bold rounded">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(u.yaratilgan_sana).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-slate-200">
                      {u.telefon}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {u.email || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="px-2 py-1 bg-slate-950 rounded-lg text-slate-300 font-semibold text-xs border border-slate-800">
                          {showPasswords[u.id] ? u.parol || '123456' : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                          title="Parolni ko'rish/yashirish"
                        >
                          {showPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-bold text-[11px]">
                        {u.listings_count || 0} ta
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {u.is_blocked ? (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-[10px]">
                          🚫 Bloklangan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[10px]">
                          ✅ Faol
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tahrirlash */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 bg-brand-500/20 hover:bg-brand-500/40 text-brand-300 rounded-lg transition-colors"
                          title="Ma'lumotlarni tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Bloklash / Blokdan chiqarish */}
                        <button
                          onClick={() => handleToggleBlock(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.is_blocked
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300'
                          }`}
                          title={u.is_blocked ? 'Blokdan chiqarish' : 'Bloklash'}
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        {/* O'chirish */}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                          title="Foydalanuvchini o'chirish"
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

      {/* Admin Tahrirlash Modali */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-500/20 text-brand-400 rounded-2xl flex items-center justify-center font-bold">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Foydalanuvchini tahrirlash</h2>
                <p className="text-xs text-slate-400">ID: {editingUser.id}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">To'liq ismi</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefon raqami (Login)</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="nom@misol.uz"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parol</label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Ruxsatlar */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 bg-slate-950 border-slate-800 focus:ring-brand-500"
                  />
                  <span className="font-semibold text-slate-300">Adminlik huquqi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsBlocked}
                    onChange={(e) => setEditIsBlocked(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 bg-slate-950 border-slate-800 focus:ring-red-500"
                  />
                  <span className="font-semibold text-red-400">Bloklangan</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
