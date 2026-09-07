import React, { useState } from 'react';
import { supabaseUrl, supabaseAnonKey, isConfigured, saveSupabaseConfig } from '../services/supabase';
import { X, Database, CheckCircle, AlertCircle, Save, ExternalLink } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseAnonKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url.trim(), key.trim());
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100">
        <button
          onClick={onClose}
          aria-label="Sozlamalar oynasini yopish"
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Supabase Sozlamalari</h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-gray-500">
                {isConfigured ? 'Supabase ulangan' : 'Local Demo Rejimida (Offlayn)'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          Loyihangiz Supabase bilan to'liq integratsiya qilingan. Baza sxemasi loyihaning <code className="bg-gray-100 px-1 py-0.5 rounded text-brand-700">supabase_schema.sql</code> faylida mavjud.
        </p>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label htmlFor="supabase-url-input" className="block text-xs font-semibold text-gray-700 mb-1">
              SUPABASE PROJECT URL
            </label>
            <input
              id="supabase-url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label htmlFor="supabase-anon-key-input" className="block text-xs font-semibold text-gray-700 mb-1">
              SUPABASE ANON KEY
            </label>
            <input
              id="supabase-anon-key-input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
            />
          </div>

          {saved && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Sozlamalar saqlandi! Sahifa yangilanmoqda...
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Saqlash va Ulanish
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              aria-label="Supabase Dashboardga o'tish"
              className="p-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              title="Supabase Dashboard"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
