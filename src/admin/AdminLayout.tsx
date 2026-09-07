import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Home,
  Users,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Building2,
  Menu,
  X
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminListings } from './AdminListings';
import { AdminUsers } from './AdminUsers';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'listings' | 'users'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_2fa_approved');
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobil Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-black text-lg text-white">
            UyBozor <span className="text-brand-500 text-xs px-2 py-0.5 bg-brand-500/20 rounded-md">ADMIN</span>
          </span>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-800 text-slate-300 rounded-xl"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Yon Menyu (Sidebar) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 p-6 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                UyBozor
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Boshqaruv Paneli
              </span>
            </div>
          </div>

          {/* Menyu Bo'limlari */}
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Statistika (Dashboard)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('listings');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'listings'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>E'lonlar boshqaruvi</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Foydalanuvchilar</span>
            </button>
          </nav>
        </div>

        {/* Pastki profil va navigatsiya */}
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <div className="p-3 bg-slate-800/60 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 truncate">
              <div className="text-xs font-bold text-white truncate">{user?.ism}</div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 2FA Faol
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
            >
              <span>Saytga o'tish</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors font-semibold text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Asosiy Kontent Maydoni */}
      <main className="flex-1 min-w-0 bg-slate-950 p-4 sm:p-8 lg:p-10 overflow-y-auto">
        {activeTab === 'dashboard' && <AdminDashboard onNavigateListings={() => setActiveTab('listings')} />}
        {activeTab === 'listings' && <AdminListings />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};
