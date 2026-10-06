import { Listing, FilterState } from '../types';
import { getSupabase } from './supabase';

const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs = 15000): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Supabase so\'rov vaqti tugadi')), timeoutMs);
  });

  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

const LISTINGS_STORAGE_KEY = 'uybozor_listings_cache';

/**
  * Dastlabki yuklanishda keshdan tezkor o'qish (HomePage 0.01s instant render)
  */
export const getStoredListings = (): Listing[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LISTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
  * E'lonlarni brauzer keshida saqlash
  */
export const saveStoredListings = (listings: Listing[]): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  } catch {
    // Kesh saqlanmasa ham xatolik yuzaga keltirmaydi
  }
};

/**
 * 1. Barcha e'lonlarni filtrlash va olish (Supabase yagona ishonchli manba)
 */
export const fetchListings = async (filter?: Partial<FilterState>): Promise<Listing[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('listings')
    .select('*')
    .eq('holat', 'faol')
    .order('yaratilgan_sana', { ascending: false });

  // Filtrlash (Turi bo'yicha)
  if (filter?.turi && filter.turi !== 'barchasi') {
    query = query.eq('turi', filter.turi);
  }

  // Xonalar soni bo'yicha
  if (filter?.xonalar_soni && filter.xonalar_soni !== 'barchasi') {
    if (filter.xonalar_soni === 5) {
      query = query.gte('xonalar_soni', 5);
    } else {
      query = query.eq('xonalar_soni', filter.xonalar_soni);
    }
  }

  // Narx bo'yicha
  if (filter?.minNarx && filter.minNarx > 0) {
    query = query.gte('narx', filter.minNarx);
  }
  if (filter?.maxNarx && filter.maxNarx > 0) {
    query = query.lte('narx', filter.maxNarx);
  }

  // Maydon bo'yicha
  if (filter?.minMaydon && filter.minMaydon > 0) {
    query = query.gte('maydon', filter.minMaydon);
  }
  if (filter?.maxMaydon && filter.maxMaydon > 0) {
    query = query.lte('maydon', filter.maxMaydon);
  }

  const { data, error } = await withTimeout(query, 15000);

  if (error) {
    console.error('[listingService] fetchListings error:', error);
    throw new Error(`E'lonlarni yuklashda xatolik: ${error.message}`);
  }

  let results = (data || []) as Listing[];

  // Manzil / viloyat / qidiruv bo'yicha mijoz filtrlari
  if (filter?.viloyat && filter.viloyat !== 'barchasi' && filter.viloyat !== 'Barchasi') {
    const v = filter.viloyat.toLowerCase();
    results = results.filter(
      item =>
        (item.viloyat && item.viloyat.toLowerCase().includes(v)) ||
        (item.shahar && item.shahar.toLowerCase().includes(v)) ||
        (item.manzil_matn && item.manzil_matn.toLowerCase().includes(v))
    );
  }

  if (filter?.shahar && filter.shahar !== 'Barchasi' && filter.shahar !== 'barchasi') {
    const s = filter.shahar.toLowerCase();
    results = results.filter(
      item =>
        (item.shahar && item.shahar.toLowerCase().includes(s)) ||
        (item.viloyat && item.viloyat.toLowerCase().includes(s)) ||
        (item.manzil_matn && item.manzil_matn.toLowerCase().includes(s))
    );
  }

  if (filter?.searchQuery && filter.searchQuery.trim() !== '') {
    const q = filter.searchQuery.toLowerCase().trim();
    results = results.filter(
      item =>
        item.shahar.toLowerCase().includes(q) ||
        (item.viloyat && item.viloyat.toLowerCase().includes(q)) ||
        (item.mahalla && item.mahalla.toLowerCase().includes(q)) ||
        (item.tuman && item.tuman.toLowerCase().includes(q)) ||
        item.manzil_matn.toLowerCase().includes(q) ||
        (item.izoh && item.izoh.toLowerCase().includes(q))
    );
  }

  // Tartiblash (Sorting)
  results.sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;

    if (filter?.sortBy === 'arzon') return a.narx - b.narx;
    if (filter?.sortBy === 'qimmat') return b.narx - a.narx;
    if (filter?.sortBy === 'maydon_katta') return b.maydon - a.maydon;
    return new Date(b.yaratilgan_sana).getTime() - new Date(a.yaratilgan_sana).getTime();
  });

  if (!filter || (filter.turi === 'barchasi' && (!filter.shahar || filter.shahar === 'Barchasi') && !filter.searchQuery)) {
    saveStoredListings(results);
  }

  return results;
};

/**
 * 2. ID bo'yicha e'lonni olish
 */
export const fetchListingById = async (id: string): Promise<Listing | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.from('listings').select('*').eq('id', id).maybeSingle(),
      15000
    );

    if (error) {
      console.warn('[listingService] fetchListingById error:', error);
      return null;
    }

    return (data as Listing) || null;
  } catch (err) {
    console.warn('[listingService] fetchListingById error:', err);
    return null;
  }
};

/**
 * 3. Foydalanuvchining o'z e'lonlarini olish
 */
export const fetchUserListings = async (userId: string): Promise<Listing[]> => {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  const { data, error } = await withTimeout(
    supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId)
      .neq('holat', 'nobakor')
      .order('yaratilgan_sana', { ascending: false }),
    15000
  );

  if (error) {
    console.error('[listingService] fetchUserListings error:', error);
    throw new Error(`E'lonlaringizni yuklashda xatolik: ${error.message}`);
  }

  return (data || []) as Listing[];
};

/**
 * 4. Yangi e'lon yaratish (RLS: user_id = auth.uid(), holat = 'kutilmoqda')
 */
export const createListing = async (
  listingData: Omit<Listing, 'id' | 'yaratilgan_sana'>
): Promise<Listing> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase xizmatiga ulanib bo\'lmadi');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('E\'lon joylashtirish uchun tizimga kirishingiz lozim!');
  }

  const listingId = 'list-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();

  const newListingPayload: any = {
    ...listingData,
    id: listingId,
    user_id: user.id, // Haqiqiy Supabase Auth foydalanuvchisi
    holat: 'kutilmoqda', // Har doim moderatsiyaga tushadi
    views_count: 0,
    can_edit: false,
    edit_requested: false,
    yaratilgan_sana: now
  };

  const { data, error } = await supabase
    .from('listings')
    .insert([newListingPayload])
    .select()
    .single();

  if (error) {
    console.error('[listingService] createListing error:', error);
    throw new Error(`E'lonni saqlashda xatolik yuz berdi: ${error.message}`);
  }

  return data as Listing;
};

/**
 * 5. E'lonni tahrirlash (RLS: can_edit=true yoki admin)
 */
export const updateListing = async (
  id: string,
  updatedData: Partial<Listing>
): Promise<Listing> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase xizmatiga ulanib bo\'lmadi');

  const { data, error } = await supabase
    .from('listings')
    .update(updatedData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[listingService] updateListing error:', error);
    throw new Error(`E'lonni yangilashda xatolik: ${error.message}`);
  }

  return data as Listing;
};

/**
 * 6. E'lonni o'chirish (RLS: faqat egasi yoki admin)
 */
export const deleteListing = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase xizmatiga ulanib bo\'lmadi');

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[listingService] deleteListing error:', error);
    throw new Error(`E'lonni o'chirishda xatolik: ${error.message}`);
  }

  return true;
};

/**
 * 7. Ko'rishlar sonini bazada xavfsiz oshirish (SECURITY DEFINER increment_listing_views RPC)
 * Bir sessiyada bir e'lonni qayta-qayta sanamaslik uchun sessionStorage tekshiruvi bilan
 */
export const incrementViewCount = async (id: string): Promise<number> => {
  const viewedKey = `viewed_listing_${id}`;
  if (typeof sessionStorage !== 'undefined') {
    if (sessionStorage.getItem(viewedKey)) {
      const supabase = getSupabase();
      const { data } = await supabase?.from('listings').select('views_count').eq('id', id).maybeSingle() || {};
      return data?.views_count ?? 0;
    }
    sessionStorage.setItem(viewedKey, 'true');
  }

  const supabase = getSupabase();
  if (!supabase) return 0;

  try {
    // 1. Bazadagi xavfsiz atomic RPC funksiyasini chaqirish
    const { error: rpcError } = await supabase.rpc('increment_listing_views', {
      p_listing_id: id
    });

    if (rpcError) {
      // Fallback: Agar RPC hali o'rnatilmagan bo'lsa
      const { data: item } = await supabase
        .from('listings')
        .select('views_count')
        .eq('id', id)
        .maybeSingle();

      const nextViews = (item?.views_count || 0) + 1;
      await supabase
        .from('listings')
        .update({ views_count: nextViews })
        .eq('id', id);

      return nextViews;
    }

    // 2. Yangi qiymatni qaytarish
    const { data } = await supabase
      .from('listings')
      .select('views_count')
      .eq('id', id)
      .maybeSingle();

    return data?.views_count ?? 1;
  } catch (err) {
    console.warn('[listingService] incrementViewCount error:', err);
    return 0;
  }
};
