import React from 'react';
import { Building2, Phone, Mail, MapPin, Heart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Kompaniya haqida */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-white">
                Uy<span className="text-brand-400">Bozor</span>
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              O'zbekistondagi eng qulay va zamonaviy ko'chmas mulk oldi-sotdi
              hamda ijara platformasi. Kvartiralar, hovlilar va tijorat
              binolari.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 p-2.5 rounded-xl font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Barcha e'lonlar tekshirilgan va xavfsiz</span>
            </div>
          </div>

          {/* Shaharlar */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Ommabop hududlar
            </h4>
            <ul className="space-y-2 text-xs text-gray-300 font-medium">
              <li>
                <Link
                  to="/?shahar=Toshkent"
                  aria-label="Toshkent shahri uylari e'lonlari"
                  className="hover:text-white transition-colors">
                  Toshkent shahri uylari
                </Link>
              </li>
              <li>
                <Link
                  to="/?shahar=Samarqand"
                  aria-label="Samarqand shahri uylari e'lonlari"
                  className="hover:text-white transition-colors">
                  Samarqand uylari
                </Link>
              </li>
              <li>
                <Link
                  to="/?shahar=Buxoro"
                  aria-label="Buxoro shahri uylari e'lonlari"
                  className="hover:text-white transition-colors">
                  Buxoro uylari
                </Link>
              </li>
              <li>
                <Link
                  to="/?shahar=Farg'ona"
                  aria-label="Farg'ona viloyati uylari e'lonlari"
                  className="hover:text-white transition-colors">
                  Farg'ona uylari
                </Link>
              </li>
              <li>
                <Link
                  to="/?shahar=Andijon"
                  aria-label="Andijon viloyati uylari e'lonlari"
                  className="hover:text-white transition-colors">
                  Andijon uylari
                </Link>
              </li>
            </ul>
          </div>

          {/* Bo'limlar */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Xizmatlar
            </h4>
            <ul className="space-y-2 text-xs text-gray-300 font-medium">
              <li>
                <Link
                  to="/?turi=sotuv"
                  aria-label="Kvartira sotib olish bo'limi"
                  className="hover:text-white transition-colors">
                  Kvartira sotib olish
                </Link>
              </li>
              <li>
                <Link
                  to="/?turi=ijara"
                  aria-label="Uzoq muddatli ijara uylari"
                  className="hover:text-white transition-colors">
                  Uzoq muddatli ijara
                </Link>
              </li>
              <li>
                <Link
                  to="/create-listing"
                  aria-label="Bepul e'lon berish sahifasi"
                  className="hover:text-white transition-colors">
                  Bepul e'lon berish
                </Link>
              </li>
              <li>
                <Link
                  to="/my-listings"
                  aria-label="Mening e'lonlarim sahifasi"
                  className="hover:text-white transition-colors">
                  Mening e'lonlarim
                </Link>
              </li>
              <li>
                <Link
                  to="/favorites"
                  aria-label="Saqlangan uylar ro'yxati"
                  className="hover:text-white transition-colors">
                  Saqlangan uylar
                </Link>
              </li>
            </ul>
          </div>

          {/* Aloqa va Yordam */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Yordam va Maslahat
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Saytdan foydalanishda muammo chiqsa yoki yordam va maslahat kerak bo'lsa, to'g'ridan-to'g'ri bog'laning:
            </p>
            <ul className="space-y-2.5 text-xs text-gray-200">
              <li>
                <a
                  href="https://t.me/AkeIsmtv"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Telegram orqali qo'llab-quvvatlash xizmati"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 rounded-xl border border-sky-500/30 transition-colors w-full font-bold"
                >
                  <span className="text-base">✈️</span>
                  <span>Telegram: @AkeIsmtv</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+998920825690"
                  aria-label="Telefon orqali qo'ng'iroq qilish: +998 92 082 56 90"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 transition-colors w-full font-bold"
                >
                  <Phone className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>+998 92 082 56 90</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-[11px] text-gray-300 pt-1">
                <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span>O'zbekiston, Surxondaryo viloyati, Termiz shahri</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-3">
          <div className="flex items-center gap-4">
            <span>&copy; {new Date().getFullYear()} UyBozor. Barcha huquqlar himoyalangan.</span>
            <Link
              to="/admin"
              aria-label="Admin panelga o'tish"
              className="text-gray-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-[11px] font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://t.me/AkeIsmtv"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram dasturchi bilan bog'lanish"
              className="text-sky-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Savol va yordam uchun:</span>
              <strong className="text-white">@AkeIsmtv</strong>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
