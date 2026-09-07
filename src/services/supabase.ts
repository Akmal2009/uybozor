import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite environment o'zgaruvchilari
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://vueidtzvefxkaxdfsiad.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_X-uV8iJElbjAqsmyrUq7ww_60wy08bc';

// Xatoliklarni tekshirish va konsolga aniq chiqarish
if (!env.VITE_SUPABASE_URL && !localStorage.getItem('supabase_url')) {
  console.error('XATO: VITE_SUPABASE_URL topilmadi. .env.local faylni tekshiring.');
}

if (!env.VITE_SUPABASE_ANON_KEY && !localStorage.getItem('supabase_anon_key')) {
  console.error('XATO: VITE_SUPABASE_ANON_KEY topilmadi. .env.local faylni tekshiring.');
}

const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_url') : null;
const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

export const supabaseUrl = localUrl || SUPABASE_URL || '';
export const supabaseAnonKey = localKey || SUPABASE_ANON_KEY || '';
export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your_supabase_url_here') &&
  !supabaseUrl.includes('your-project')
);

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!supabaseInstance && isConfigured) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
      console.log('[Supabase] Supabase mijoziga muvaffaqiyatli ulandi:', supabaseUrl);
    } catch (e) {
      console.error('[Supabase] Supabase initialization failed:', e);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  window.location.reload();
};
