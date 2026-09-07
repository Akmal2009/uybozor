import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import {
  Home,
  PlusCircle,
  Heart,
  User as UserIcon,
  LogOut,
  ListOrdered,
  Menu,
  X,
  ChevronDown,
  Building2,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { ProfileModal } from './ProfileModal';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { favoritesCount } = useFavorites();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo va Brend */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight text-gray-900 flex items-center">
                    Uy<span className="text-brand-600">Bozor</span>
                  </span>
                  <span className="text-[10px] block font-semibold text-gray-400 -mt-1 tracking-wider uppercase">
                    Ko'chmas mulk
                  </span>
                </div>
              </Link>

              {/* Asosiy navigatsiya tablari (Desktop) */}
              <nav className="hidden md:flex items-center gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl">
                <Link
                  to="/"
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    isActive('/') && !location.search.includes('turi=ijara') && !location.search.includes('turi=sotuv')
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bosh sahifa
                </Link>
                <Link
                  to="/?turi=sotuv"
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    location.search.includes('turi=sotuv')
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Uy sotib olish
                </Link>
                <Link
                  to="/?turi=ijara"
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    location.search.includes('turi=ijara')
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Uy ijarasi
                </Link>
              </nav>
            </div>

            {/* O'ng tomon: Sevimlilar, E'lon berish, Profil */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Yordam / Telegram */}
              <a
                href="https://t.me/AkeIsmtv"
                target="_blank"
                rel="noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold border border-sky-200 transition-colors shadow-sm"
                title="Muammo yoki savollar uchun Telegram aloqa"
              >
                <span>✈️ Yordam: @AkeIsmtv</span>
              </a>

              {/* Sevimlilar */}
              <Link
                to="/favorites"
                aria-label="Saralangan e'lonlar ro'yxati"
                className="relative p-2.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                title="Saralangan e'lonlar"
              >
                <Heart className="w-5 h-5" />
                {favoritesCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {favoritesCount}
                  </span>
                )}
              </Link>

              {/* E'lon joylash tugmasi */}
              <Link
                to="/create-listing"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-2xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>E'lon joylash</span>
              </Link>

              {/* Profil yoki Kirish */}
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Foydalanuvchi profil menyusini ochish"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition-colors"
                  >
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.ism}`}
                      alt={user.ism}
                      width={28}
                      height={28}
                      loading="lazy"
                      decoding="async"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-brand-300"
                    />
                    <span className="text-xs font-bold text-gray-800 max-w-[100px] truncate">
                      {user.ism.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 mr-1" />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-xs font-bold text-gray-900">{user.ism}</div>
                        <div className="text-[11px] text-gray-500 truncate">{user.telefon}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors font-medium text-left"
                      >
                        <Settings className="w-4 h-4 text-brand-600" />
                        Mening profilim (sozlamalar)
                      </button>

                      <Link
                        to="/my-listings"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors font-medium"
                      >
                        <ListOrdered className="w-4 h-4 text-brand-600" />
                        Mening e'lonlarim
                      </Link>

                      <Link
                        to="/favorites"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors font-medium"
                      >
                        <Heart className="w-4 h-4 text-red-500" />
                        Saralanganlar ({favoritesCount})
                      </Link>

                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors font-bold rounded-xl mx-2 my-1"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Admin Boshqaruv Paneli
                      </Link>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        type="button"
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Chiqish
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-brand-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-brand-600" />
                  <span>Kirish</span>
                </button>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center gap-2 sm:hidden">
              <Link
                to="/favorites"
                aria-label="Saralangan e'lonlar"
                className="relative p-2 text-gray-700"
              >
                <Heart className="w-5 h-5" />
                {favoritesCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {favoritesCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                aria-label={isMenuOpen ? "Menyuni yopish" : "Asosiy mobil menyuni ochish"}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-gray-800" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-3">
            <nav className="flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive('/') ? 'bg-brand-50 text-brand-700' : 'text-gray-700'
                }`}
              >
                Bosh sahifa
              </Link>
              <Link
                to="/?turi=sotuv"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Uy sotib olish
              </Link>
              <Link
                to="/?turi=ijara"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Uy ijarasi
              </Link>
              {isAuthenticated && (
                <Link
                  to="/my-listings"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50"
                >
                  Mening e'lonlarim
                </Link>
              )}
            </nav>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <Link
                to="/create-listing"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-3 bg-brand-600 text-white rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2 shadow"
              >
                <PlusCircle className="w-4 h-4" />
                E'lon joylash
              </Link>

              {/* Yordam & Aloqa */}
              <a
                href="https://t.me/AkeIsmtv"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-2.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>✈️ Telegram: @AkeIsmtv</span>
              </a>

              {isAuthenticated && user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-sm font-semibold text-red-600 bg-red-50 rounded-xl"
                >
                  Chiqish ({user.ism})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    openAuthModal();
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl"
                >
                  Kirish / Ro'yxatdan o'tish
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Profil Sozlamalari Modali */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
