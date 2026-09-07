import { Listing, ListingStatus, FilterState } from '../types';
import { INITIAL_LISTINGS } from './mockData';
import { getSupabase } from './supabase';

const LISTINGS_STORAGE_KEY = 'uybozor_listings';

// Yordamchi timeout funksiyasi (Supabase qotib qolmasligi uchun 2 soniyalik limit)
const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs = 2000): Promise<T> => {
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

// Local storage'dan e'lonlarni olish
export const getStoredListings = (): Listing[] => {
  const data = localStorage.getItem(LISTINGS_STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    const parsed: Listing[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Eski test (mock) e'lonlarini tozalash
    const cleaned = parsed.filter(item => 
      item && !['list-surxon-1', 'list-surxon-2', 'list-toshkent-1'].includes(item.id)
    );
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
};

export const saveStoredListings = (listings: Listing[]) => {
  try {
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  } catch (e) {
    console.warn('[listingService] LocalStorage quota exceeded, storing safe slim cache');
    try {
      // Agar xotira to'lsa, xatolik chiqarmaydi va ixcham holda saqlaydi
      const slim = listings.slice(0, 15).map(l => ({
        ...l,
        rasmlar: Array.isArray(l.rasmlar) ? l.rasmlar.slice(0, 1) : []
      }));
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // Hech qanday xatolik ko'rsatmaydi
    }
  }
};

// Barcha e'lonlarni filtrlash va olish (Tezkor va Ishonchli)
export const fetchListings = async (filter?: Partial<FilterState>): Promise<Listing[]> => {
  const supabase = getSupabase();
  let rawListings: Listing[] = [];

  if (supabase) {
    try {
      const res: any = await withTimeout(
        supabase
          .from('listings')
          .select('*')
          .order('yaratilgan_sana', { ascending: false }),
        3500
      );

      if (!res.error && Array.isArray(res.data)) {
        rawListings = res.data as Listing[];
        saveStoredListings(rawListings);
      }
    } catch (e) {
      console.warn('[listingService] Supabase fetchListings fallback:', e);
    }
  }

  if (rawListings.length === 0) {
    rawListings = getStoredListings();
  }

  // Faqat 'faol' holatdagi e'lonlarni olish
  let results = rawListings.filter(item => item && item.holat === 'faol');

  // Filtrlash (Turi bo'yicha)
  if (filter?.turi && filter.turi !== 'barchasi') {
    results = results.filter(item => item.turi === filter.turi);
  }

  // Viloyat bo'yicha filtrlash
  if (filter?.viloyat && filter.viloyat !== 'barchasi' && filter.viloyat !== 'Barchasi') {
    const v = filter.viloyat.toLowerCase();
    results = results.filter(
      item =>
        (item.viloyat && item.viloyat.toLowerCase().includes(v)) ||
        (item.shahar && item.shahar.toLowerCase().includes(v)) ||
        (item.manzil_matn && item.manzil_matn.toLowerCase().includes(v))
    );
  }

  // Tuman bo'yicha filtrlash
  if (filter?.tuman && filter.tuman !== 'barchasi' && filter.tuman !== 'Barchasi') {
    const t = filter.tuman.toLowerCase();
    results = results.filter(
      item =>
        (item.tuman && item.tuman.toLowerCase().includes(t)) ||
        (item.mahalla && item.mahalla.toLowerCase().includes(t)) ||
        (item.manzil_matn && item.manzil_matn.toLowerCase().includes(t)) ||
        (item.shahar && item.shahar.toLowerCase().includes(t))
    );
  }

  // Shahar bo'yicha filtrlash
  if (filter?.shahar && filter.shahar !== 'Barchasi' && filter.shahar !== 'barchasi') {
    const s = filter.shahar.toLowerCase();
    results = results.filter(
      item =>
        (item.shahar && item.shahar.toLowerCase().includes(s)) ||
        (item.viloyat && item.viloyat.toLowerCase().includes(s)) ||
        (item.manzil_matn && item.manzil_matn.toLowerCase().includes(s))
    );
  }

  // Xonalar soni
  if (filter?.xonalar_soni && filter.xonalar_soni !== 'barchasi') {
    if (filter.xonalar_soni === 5) {
      results = results.filter(item => item.xonalar_soni >= 5);
    } else {
      results = results.filter(item => item.xonalar_soni === filter.xonalar_soni);
    }
  }

  // Narx bo'yicha
  if (filter?.minNarx !== undefined && filter.minNarx > 0) {
    results = results.filter(item => item.narx >= filter.minNarx!);
  }
  if (filter?.maxNarx !== undefined && filter.maxNarx > 0) {
    results = results.filter(item => item.narx <= filter.maxNarx!);
  }

  // Maydon bo'yicha
  if (filter?.minMaydon !== undefined && filter.minMaydon > 0) {
    results = results.filter(item => item.maydon >= filter.minMaydon!);
  }
  if (filter?.maxMaydon !== undefined && filter.maxMaydon > 0) {
    results = results.filter(item => item.maydon <= filter.maxMaydon!);
  }

  // Qidiruv bo'yicha
  if (filter?.searchQuery && filter.searchQuery.trim() !== '') {
    const q = filter.searchQuery.toLowerCase();
    results = results.filter(
      item =>
        (item.manzil_matn && item.manzil_matn.toLowerCase().includes(q)) ||
        (item.shahar && item.shahar.toLowerCase().includes(q)) ||
        (item.viloyat && item.viloyat.toLowerCase().includes(q)) ||
        (item.tuman && item.tuman.toLowerCase().includes(q)) ||
        (item.izoh && item.izoh.toLowerCase().includes(q)) ||
        (item.telefon && item.telefon.includes(q))
    );
  }

  // Sorting
  results.sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;

    if (filter?.sortBy === 'arzon') return a.narx - b.narx;
    if (filter?.sortBy === 'qimmat') return b.narx - a.narx;
    if (filter?.sortBy === 'maydon_katta') return b.maydon - a.maydon;
    return new Date(b.yaratilgan_sana).getTime() - new Date(a.yaratilgan_sana).getTime();
  });

  return results;
};

// ID bo'yicha e'lonni olish
export const fetchListingById = async (id: string): Promise<Listing | null> => {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const res: any = await withTimeout(
        supabase.from('listings').select('*').eq('id', id).single(),
        3000
      );
      if (!res.error && res.data) {
        return res.data as Listing;
      }
    } catch (e) {
      // fallback
    }
  }

  const listings = getStoredListings();
  return listings.find(item => item.id === id) || null;
};

// Foydalanuvchining e'lonlarini olish
export const fetchUserListings = async (userId: string): Promise<Listing[]> => {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const res: any = await withTimeout(
        supabase
          .from('listings')
          .select('*')
          .eq('user_id', userId)
          .neq('holat', 'nobakor')
          .order('yaratilgan_sana', { ascending: false }),
        3000
      );

      if (!res.error && Array.isArray(res.data)) {
        return res.data as Listing[];
      }
    } catch (e) {
      // fallback
    }
  }

  const listings = getStoredListings();
  return listings.filter(item => item.user_id === userId && item.holat !== 'nobakor');
};

// Yangi e'lon yaratish
export const createListing = async (listingData: Omit<Listing, 'id' | 'yaratilgan_sana'>): Promise<Listing> => {
  const supabase = getSupabase();
  const listingId = 'list-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();

  const fullListing: Listing = {
    ...listingData,
    id: listingId,
    views_count: 0,
    yaratilgan_sana: now
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .insert([fullListing])
        .select()
        .single();

      if (!error && data) {
        const created = data as Listing;
        const stored = getStoredListings();
        stored.unshift(created);
        saveStoredListings(stored);
        return created;
      } else if (error) {
        console.error('[Supabase createListing error]:', error);
      }
    } catch (e) {
      console.warn('Supabase create error:', e);
    }
  }

  const listings = getStoredListings();
  listings.unshift(fullListing);
  saveStoredListings(listings);
  return fullListing;
};

// E'lonni yangilash
export const updateListing = async (id: string, updatedData: Partial<Listing>): Promise<Listing> => {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const updated = data as Listing;
        const stored = getStoredListings();
        const index = stored.findIndex(item => item.id === id);
        if (index !== -1) {
          stored[index] = updated;
          saveStoredListings(stored);
        }
        return updated;
      } else if (error) {
        console.error('[Supabase updateListing error]:', error);
      }
    } catch (e) {
      console.warn('Supabase update error:', e);
    }
  }

  const listings = getStoredListings();
  const index = listings.findIndex(item => item.id === id);
  if (index !== -1) {
    listings[index] = { ...listings[index], ...updatedData };
    saveStoredListings(listings);
    return listings[index];
  }

  return { id, ...updatedData } as Listing;
};

// E'lonni o'chirish
export const deleteListing = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();

  if (supabase) {
    try {
      await supabase.from('listings').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }

  const listings = getStoredListings();
  const filtered = listings.filter(item => item.id !== id);
  saveStoredListings(filtered);
  return true;
};

// Ko'rishlar sonini oshirish
export const incrementViewCount = async (id: string) => {
  const listings = getStoredListings();
  const index = listings.findIndex(item => item.id === id);
  if (index !== -1) {
    listings[index].views_count = (listings[index].views_count || 0) + 1;
    saveStoredListings(listings);
  }
};
