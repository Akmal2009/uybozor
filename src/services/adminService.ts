import { Listing, User, Payment, LoginRequest } from '../types';
import { getSupabase } from './supabase';
import { getStoredListings, saveStoredListings, deleteListing, updateListing } from './listingService';
import { getStoredUsers } from './authService';
import { getStoredPayments } from './paymentService';

const LOGIN_REQUESTS_KEY = 'uybozor_login_requests';

// Local storage dan login so'rovlarini olish
export const getStoredLoginRequests = (): LoginRequest[] => {
  const data = localStorage.getItem(LOGIN_REQUESTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveStoredLoginRequests = (requests: LoginRequest[]) => {
  localStorage.setItem(LOGIN_REQUESTS_KEY, JSON.stringify(requests));
};

// 1. Yangi login so'rovini yaratish
export const createLoginRequest = async (
  userId: string,
  userName: string,
  userPhone: string
): Promise<LoginRequest> => {
  const requestId = 'req-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const newRequest: LoginRequest = {
    id: requestId,
    status: 'kutilmoqda',
    user_id: userId,
    user_name: userName,
    user_phone: userPhone,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('login_requests').insert([
        {
          id: newRequest.id,
          status: 'kutilmoqda',
          user_id: userId,
          user_name: userName,
          user_phone: userPhone
        }
      ]);
    } catch (e) {
      console.warn('[Admin Service] Supabase login_requests insert error:', e);
    }
  }

  const list = getStoredLoginRequests();
  list.unshift(newRequest);
  saveStoredLoginRequests(list);

  return newRequest;
};

// 2. Login so'rovi holatini tekshirish
export const checkLoginRequestStatus = async (
  requestId: string
): Promise<'kutilmoqda' | 'tasdiqlangan' | 'rad_etilgan'> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('login_requests')
        .select('status')
        .eq('id', requestId)
        .single();

      if (!error && data) {
        return data.status as any;
      }
    } catch (e) {
      // fallback
    }
  }

  const list = getStoredLoginRequests();
  const req = list.find(r => r.id === requestId);
  return req ? req.status : 'kutilmoqda';
};

// 3. Admin login so'rovini tasdiqlash yoki rad etish
export const updateLoginRequestStatus = async (
  requestId: string,
  status: 'tasdiqlangan' | 'rad_etilgan'
): Promise<boolean> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('login_requests')
        .update({ status })
        .eq('id', requestId);
    } catch (e) {
      console.warn('[Admin Service] Supabase update login request error:', e);
    }
  }

  const list = getStoredLoginRequests();
  const index = list.findIndex(r => r.id === requestId);
  if (index !== -1) {
    list[index].status = status;
    saveStoredLoginRequests(list);
  }

  return true;
};

// 4. Barcha e'lonlarni olish (Admin uchun barcha statuslar, shu jumladan nobakor / o'chirilganlar)
export const fetchAllAdminListings = async (): Promise<Listing[]> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('yaratilgan_sana', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Listing[];
      }
    } catch (e) {
      console.warn('Supabase fetchAllAdminListings error:', e);
    }
  }

  return getStoredListings();
};

// 5. Barcha foydalanuvchilarni olish (parollari bilan)
export const fetchAllAdminUsers = async (): Promise<Array<User & { listings_count?: number }>> => {
  const supabase = getSupabase();
  let users: User[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('yaratilgan_sana', { ascending: false });

      if (!error && data) {
        users = data.map((u: any) => ({
          id: u.id,
          ism: u.ism,
          telefon: u.telefon,
          email: u.email,
          parol: u.parol_hash ? atob(u.parol_hash) : u.parol || '123456',
          avatar_url: u.avatar_url,
          is_admin: u.is_admin,
          is_blocked: u.is_blocked,
          yaratilgan_sana: u.yaratilgan_sana
        }));
      }
    } catch (e) {
      console.warn('Supabase fetchAllAdminUsers error:', e);
    }
  }

  if (users.length === 0) {
    users = getStoredUsers();
  }

  const listings = await fetchAllAdminListings();

  return users.map(u => ({
    ...u,
    parol: u.parol || '123456',
    listings_count: listings.filter(l => l.user_id === u.id).length
  }));
};

// 6. Admin tomonidan foydalanuvchi ma'lumotlarini (ism, telefon, email, parol) to'g'ridan-to'g'ri tahrirlash
export const updateAdminUser = async (userId: string, data: Partial<User>): Promise<boolean> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('users')
        .update({
          ism: data.ism,
          telefon: data.telefon,
          email: data.email,
          parol_hash: data.parol ? btoa(data.parol) : undefined,
          is_admin: data.is_admin,
          is_blocked: data.is_blocked
        })
        .eq('id', userId);
    } catch (e) {
      console.warn('Supabase updateAdminUser error:', e);
    }
  }

  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...data };
    localStorage.setItem('uybozor_users', JSON.stringify(users));
  }

  return true;
};

// 7. Admin tomonidan foydalanuvchini o'chirish
export const deleteAdminUser = async (userId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('users')
        .delete()
        .eq('id', userId);
    } catch (e) {
      console.warn('Supabase deleteAdminUser error:', e);
    }
  }

  const users = getStoredUsers();
  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem('uybozor_users', JSON.stringify(filtered));

  return true;
};

// 8. Barcha to'lovlarni olish
export const fetchAllAdminPayments = async (): Promise<Payment[]> => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('sana', { ascending: false });

      if (!error && data) {
        return data as Payment[];
      }
    } catch (e) {
      console.warn('Supabase fetchAllAdminPayments error:', e);
    }
  }

  return getStoredPayments();
};

// 9. Foydalanuvchini bloklash / blokdan chiqarish
export const toggleUserBlock = async (userId: string, isBlocked: boolean): Promise<boolean> => {
  return updateAdminUser(userId, { is_blocked: isBlocked });
};

// 10. Foydalanuvchiga adminlik berish / olish
export const toggleUserAdmin = async (userId: string, isAdmin: boolean): Promise<boolean> => {
  return updateAdminUser(userId, { is_admin: isAdmin });
};

// 11. Admin statistikasini hisoblash
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
