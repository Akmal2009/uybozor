import { Listing, User, Payment, LoginRequest } from '../types';
import { getSupabase } from './supabase';
import { sanitizePhone, isValidEmail } from './authService';

// ==============================================================================
// 1. ADMIN 2FA LOGIN SO'ROVLARI (SERVER-SIDE EDGE FUNCTION ORQALI)
// ==============================================================================

/**
 * Yangi 2FA login so'rovini yaratish
 */
export const createLoginRequest = async (
  userId: string,
  userName: string,
  userPhone: string
): Promise<LoginRequest> => {
  const supabase = getSupabase();
  const fallbackId = 'req-' + Date.now();

  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: {
          action: 'create_2fa',
          userId,
          userName,
          userPhone
        }
      });

      if (!error && data?.success) {
        return {
          id: data.id,
          status: 'kutilmoqda',
          user_id: userId,
          user_name: userName,
          user_phone: userPhone,
          created_at: new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('[adminService] createLoginRequest invoke error:', e);
    }
  }

  return {
    id: fallbackId,
    status: 'kutilmoqda',
    user_id: userId,
    user_name: userName,
    user_phone: userPhone,
    created_at: new Date().toISOString()
  };
};

/**
 * 2FA login so'rovi holatini tekshirish
 */
export const checkLoginRequestStatus = async (
  requestId: string
): Promise<'kutilmoqda' | 'tasdiqlangan' | 'rad_etilgan'> => {
  const supabase = getSupabase();
  if (!supabase) return 'kutilmoqda';

  try {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: {
        action: 'check_2fa',
        requestId
      }
    });

    if (!error && data?.success) {
      return data.status || 'kutilmoqda';
    }
  } catch (e) {
    console.warn('[adminService] checkLoginRequestStatus error:', e);
  }

  return 'kutilmoqda';
};

/**
 * 2. Admin hisob ma'lumotlarini serverda xavfsiz tekshirish
 * DIQQAT: Hech qanday hardcoded parol yoki MASTER_ADMIN_HASH qolmadi!
 * Tekshiruv 100% server-side Edge Function / PostgreSQL RPC orqali o'tadi.
 */
export const verifyAdminCredentials = async (
  loginInput: string,
  passwordInput: string
): Promise<{ success: boolean; adminInfo?: { name: string; phone: string }; error?: string }> => {
  const cleanLogin = (loginInput || '').trim().toLowerCase();
  const cleanPassword = (passwordInput || '').trim();

  if (!cleanLogin || !cleanPassword) {
    return { success: false, error: 'Login va parolni kiriting' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase xizmatiga ulanib bo\'lmadi' };
  }

  try {
    // 1. Supabase Edge Function orqali xavfsiz tekshirish
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: {
        action: 'verify',
        login: cleanLogin,
        password: cleanPassword
      }
    });

    if (error) {
      return { success: false, error: error.message || 'Kirishni tekshirishda xatolik yuz berdi' };
    }

    if (data && data.success) {
      return {
        success: true,
        adminInfo: data.adminInfo || {
          name: 'Administrator',
          phone: cleanLogin
        }
      };
    }

    return {
      success: false,
      error: data?.error || 'Xato! Login yoki parol noto\'g\'ri kiritildi.'
    };
  } catch (err: any) {
    console.error('[adminService] verifyAdminCredentials error:', err);
    return { success: false, error: err.message || 'Server bilan ulanishda xatolik yuz berdi' };
  }
};

/**
 * 3. Barcha e'lonlarni olish (Admin moderatsiyasi uchun)
 */
export const fetchAllAdminListings = async (): Promise<Listing[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('yaratilgan_sana', { ascending: false });

  if (error) {
    console.error('[adminService] fetchAllAdminListings error:', error);
    throw new Error(`E'lonlarni yuklashda xatolik: ${error.message}`);
  }

  return (data || []) as Listing[];
};

/**
 * 4. Barcha foydalanuvchilarni olish (parollarsiz, xavfsiz)
 */
export const fetchAllAdminUsers = async (): Promise<Array<User & { listings_count?: number }>> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Avval profiles jadvalini tekshiramiz
  let usersData: any[] = [];
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, ism, telefon, email, avatar_url, is_admin, is_blocked, yaratilgan_sana')
    .order('yaratilgan_sana', { ascending: false });

  if (!pError && profiles) {
    usersData = profiles;
  } else {
    // Agar profiles hali to'liq yaratilmagan bo'lsa, users jadvalidan
    const { data: users, error: uError } = await supabase
      .from('users')
      .select('id, ism, telefon, email, avatar_url, is_admin, is_blocked, yaratilgan_sana')
      .order('yaratilgan_sana', { ascending: false });

    if (uError) {
      console.error('[adminService] fetchAllAdminUsers error:', uError);
      throw new Error(`Foydalanuvchilarni yuklashda xatolik: ${uError.message}`);
    }
    usersData = users || [];
  }

  // E'lonlar sonini hisoblash
  const { data: listings } = await supabase.from('listings').select('id, user_id');
  const countsMap = new Map<string, number>();

  if (listings) {
    for (const l of listings) {
      if (l.user_id) {
        countsMap.set(l.user_id, (countsMap.get(l.user_id) || 0) + 1);
      }
    }
  }

  return usersData.map(u => ({
    id: u.id,
    ism: u.ism,
    telefon: u.telefon,
    email: u.email,
    avatar_url: u.avatar_url,
    is_admin: Boolean(u.is_admin),
    is_blocked: Boolean(u.is_blocked),
    yaratilgan_sana: u.yaratilgan_sana,
    listings_count: countsMap.get(u.id) || 0
  }));
};

/**
 * 5. Foydalanuvchini bloklash / blokdan chiqarish
 */
export const toggleUserBlock = async (userId: string, isBlocked: boolean): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase ulanishi mavjud emas');

  const { error: pErr } = await supabase
    .from('profiles')
    .update({ is_blocked: isBlocked })
    .eq('id', userId);

  // Zaxira uchun users jadvalini ham yangilash
  await supabase
    .from('users')
    .update({ is_blocked: isBlocked })
    .eq('id', userId);

  if (pErr) {
    throw new Error(`Foydalanuvchi holatini yangilab bo'lmadi: ${pErr.message}`);
  }

  return true;
};

/**
 * 6. Foydalanuvchiga adminlik berish / olish
 */
export const toggleUserAdmin = async (userId: string, isAdmin: boolean): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase ulanishi mavjud emas');

  const { error: pErr } = await supabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId);

  await supabase
    .from('users')
    .update({ is_admin: isAdmin })
    .eq('id', userId);

  if (pErr) {
    throw new Error(`Admin huquqini yangilab bo'lmadi: ${pErr.message}`);
  }

  return true;
};

/**
 * 6.1. Foydalanuvchi ma'lumotlarini tahrirlash (Admin panel orqali)
 */
export const updateAdminUser = async (
  userId: string,
  data: {
    ism?: string;
    telefon?: string;
    email?: string;
    parol?: string;
    is_admin?: boolean;
    is_blocked?: boolean;
  }
): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase ulanishi mavjud emas');

  const profileUpdate: Record<string, any> = {};
  if (data.ism !== undefined) profileUpdate.ism = data.ism;
  if (data.telefon !== undefined) profileUpdate.telefon = sanitizePhone(data.telefon);
  if (data.email !== undefined) profileUpdate.email = data.email.trim();
  if (data.is_admin !== undefined) profileUpdate.is_admin = data.is_admin;
  if (data.is_blocked !== undefined) profileUpdate.is_blocked = data.is_blocked;

  const { error: pErr } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId);

  // Zaxira uchun users jadvalini ham sinxronlash
  const userUpdate: Record<string, any> = { ...profileUpdate };
  if (data.parol) {
    userUpdate.parol = data.parol;
  }

  await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', userId);

  if (pErr) {
    console.warn('[adminService] updateAdminUser profile update notice:', pErr);
  }

  return true;
};

/**
 * 6.2. Foydalanuvchini o'chirish (Admin panel orqali)
 */
export const deleteAdminUser = async (userId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase ulanishi mavjud emas');

  const { error: pErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (pErr) {
    console.warn('[adminService] deleteAdminUser error:', pErr);
  }

  return true;
};

/**
 * 7. Barcha to'lovlarni olish
 */
export const fetchAllAdminPayments = async (): Promise<Payment[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('sana', { ascending: false });

  if (error) {
    console.error('[adminService] fetchAllAdminPayments error:', error);
    throw new Error(`To'lovlarni yuklashda xatolik: ${error.message}`);
  }

  return (data || []) as Payment[];
};

/**
 * 8. Admin statistikasini hisoblash
 */
export const fetchAdminStats = async () => {
  const listings = await fetchAllAdminListings();
  const users = await fetchAllAdminUsers();

  const totalListings = listings.length;
  const pendingListings = listings.filter(l => l.holat === 'kutilmoqda').length;
  const activeListings = listings.filter(l => l.holat === 'faol').length;
  const vipListings = listings.filter(l => l.is_vip && l.holat === 'faol').length;
  const rejectedListings = listings.filter(l => l.holat === 'rad_etildi').length;
  const soldListings = listings.filter(l => l.holat === 'sotilgan').length;
  const deletedListings = listings.filter(l => l.holat === 'nobakor').length;

  const totalUsers = users.length;
  const blockedUsers = users.filter(u => u.is_blocked).length;
  const editRequests = listings.filter(l => l.edit_requested && !l.can_edit);

  return {
    totalListings,
    pendingListings,
    activeListings,
    vipListings,
    rejectedListings,
    soldListings,
    deletedListings,
    totalUsers,
    blockedUsers,
    editRequests,
    recentListings: listings.slice(0, 8),
    recentVipListings: listings.filter(l => l.is_vip).slice(0, 8)
  };
};
