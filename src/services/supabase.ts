import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Build-time environment o'zgaruvchilari (Faqat VITE_ env orqali olinadi)
const env = (import.meta as any).env || {};
export const supabaseUrl: string = env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey: string = env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your_supabase_url_here') &&
  !supabaseUrl.includes('your-project')
);

if (!isConfigured) {
  console.error('XATO: VITE_SUPABASE_URL yoki VITE_SUPABASE_ANON_KEY topilmadi. .env faylni tekshiring.');
}

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!supabaseInstance && isConfigured) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }
      });
    } catch (e) {
      console.error('[Supabase] Initsializatsiya xatosi:', e);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
};
