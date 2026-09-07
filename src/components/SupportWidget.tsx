import React, { useState } from 'react';
import { Phone, ExternalLink, Sparkles, X } from 'lucide-react';

export const SupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Support Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-500 via-sky-600 to-brand-600 hover:from-sky-600 hover:to-brand-700 text-white rounded-full shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all font-bold text-xs sm:text-sm border-2 border-white/20"
          aria-label="Yordam va Maslahat"
        >
          <span className="text-base animate-bounce">✈️</span>
          <span className="hidden sm:inline">Yordam & Maslahat</span>
          <span className="sm:hidden">Yordam</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      </div>

      {/* Support Popup Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative border border-gray-100 space-y-5 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl font-bold border border-sky-100">
                ✈️
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Yordam va Maslahat
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Muammo yoki savol bo'lsa biz doim aloqadamiz!
                </p>
              </div>
            </div>

            {/* Content Note */}
            <div className="p-3.5 bg-sky-50/80 rounded-2xl border border-sky-100 text-xs text-sky-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sky-950">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Savolingiz yoki taklifingiz bormi?</span>
              </div>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                E'lon joylash, qidiruv, VIP maqomini olish yoki boshqa har qanday masalada quyidagi raqam va Telegram orqali murojaat qilishingiz mumkin.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Telegram */}
              <a
                href="https://t.me/AkeIsmtv"
                target="_blank"
                rel="noreferrer"
                className="w-full p-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-2xl shadow-md shadow-sky-500/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✈️</span>
                  <div className="text-left">
                    <div className="text-xs text-sky-100 font-medium">Telegram orqali yozish</div>
                    <div className="text-sm font-black">@AkeIsmtv</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-200 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Phone */}
              <a
                href="tel:+998920825690"
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-emerald-100 font-medium">Telefon orqali qo'ng'iroq</div>
                    <div className="text-sm font-black">+998 92 082 56 90</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            {/* Footer note */}
            <div className="text-center pt-1 border-t border-gray-100 text-[11px] text-gray-400">
              Ish vaqti: 24/7 tezkor aloqa
            </div>
          </div>
        </div>
      )}
    </>
  );
};
