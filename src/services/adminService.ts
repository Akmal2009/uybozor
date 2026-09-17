import { Listing, User, Payment, LoginRequest } from '../types';
import { getSupabase } from './supabase';
import { getStoredListings, saveStoredListings, deleteListing, updateListing } from './listingService';
import { getStoredUsers, saveStoredUsers, hashPassword } from './authService';
import { getStoredPayments } from './paymentService';
import bcrypt from 'bcryptjs';

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

/**
 * 3.1. Admin hisobini ro'yxatdan o'tkazish (Supabase bazasiga xavfsiz bcrypt hesh bilan)
 */
export const registerAdminUser = async (
  ism: string,
  login: string,
  telefon: string,
  parol: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanIsm = ism.trim();
  const cleanLogin = login.trim().toLowerCase();
  const cleanPhone = telefon.trim().replace(/\s+/g, '');
  const cleanPassword = parol.trim();

  if (!cleanIsm || !cleanLogin || !cleanPhone || !cleanPassword) {
    return { success: false, error: 'Barcha maydonlarni to\'ldiring' };
  }

  if (cleanPassword.length < 6) {
    return { success: false, error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' };
  }

  const supabase = getSupabase();
  const passHash = bcrypt.hashSync(cleanPassword, 10);
  const adminId = 'admin-' + Date.now();

  if (supabase) {
    try {
      // 1. Mavjud admin yoki foydalanuvchini tekshirish
      const { data: existing } = await supabase
        .from('users')
        .select('id, ism')
        .or(`telefon.eq.${cleanPhone},email.eq.${cleanLogin}`)
        .maybeSingle();

      if (existing) {
        // Agar foydalanuvchi allaqachon mavjud bo'lsa, uni adminga yangilash
        const { error: updErr } = await supabase
          .from('users')
          .update({
            ism: cleanIsm,
            telefon: cleanPhone,
            email: cleanLogin.includes('@') ? cleanLogin : `${cleanLogin}@uybozor.admin`,
            parol_hash: passHash,
            is_admin: true,
            is_blocked: false
          })
          .eq('id', existing.id);

        if (updErr) {
          return { success: false, error: 'Admin hisobini yangilashda xatolik: ' + updErr.message };
        }
        return { success: true };
      }

      // 2. Yangi admin qo'shish
      const { error: insErr } = await supabase.from('users').insert([
        {
          id: adminId,
          ism: cleanIsm,
          telefon: cleanPhone,
          email: cleanLogin.includes('@') ? cleanLogin : `${cleanLogin}@uybozor.admin`,
          parol_hash: passHash,
          is_admin: true,
          is_blocked: false,
          yaratilgan_sana: new Date().toISOString()
        }
      ]);

      if (insErr) {
        return { success: false, error: 'Bazaga saqlashda xatolik: ' + insErr.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server xatosi yuz berdi' };
    }
  }

  // Supabase ulanmagan holat uchun zaxira (local fallback)
  const localUsers = getStoredUsers();
  const existingIdx = localUsers.findIndex(u => u.telefon === cleanPhone || u.email === cleanLogin);
  if (existingIdx !== -1) {
    localUsers[existingIdx].ism = cleanIsm;
    localUsers[existingIdx].is_admin = true;
    localUsers[existingIdx].parol = cleanPassword;
    saveStoredUsers(localUsers);
  } else {
    localUsers.push({
      id: adminId,
      ism: cleanIsm,
      telefon: cleanPhone,
      email: cleanLogin,
      parol: cleanPassword,
      is_admin: true,
      yaratilgan_sana: new Date().toISOString()
    });
    saveStoredUsers(localUsers);
  }

  return { success: true };
};

/**
 * 3.2. Admin hisob ma'lumotlarini dinamik tekshirish (100% kodda ochiq kalitsiz)
 */
export const verifyAdminCredentials = async (
  loginInput: string,
  passwordInput: string
): Promise<{ success: boolean; adminInfo?: { name: string; phone: string }; error?: string }> => {
  const cleanLogin = loginInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanLogin || !cleanPassword) {
    return { success: false, error: 'Login va parolni kiriting' };
  }

  const supabase = getSupabase();

  if (supabase) {
    try {
      // 1. Supabase users jadvalidan is_admin = true foydalanuvchilarni olish
      const { data: adminUsers, error } = await supabase.from('users').select('*').eq('is_admin', true);

      if (!error && adminUsers && adminUsers.length > 0) {
        const cleanPhoneDigits = cleanLogin.replace(/[^\d]/g, '');

        for (const user of adminUsers) {
          const uPhoneDigits = (user.telefon || '').replace(/[^\d]/g, '');
          const uEmail = (user.email || '').toLowerCase();
          const uEmailPrefix = uEmail.split('@')[0];
          const uName = (user.ism || '').toLowerCase();
          const uPhone = (user.telefon || '').replace(/\s+/g, '').toLowerCase();

          const isIdentifierMatch =
            (cleanPhoneDigits.length >= 9 && uPhoneDigits === cleanPhoneDigits) ||
            uPhone === cleanLogin ||
            uEmail === cleanLogin ||
            uEmailPrefix === cleanLogin ||
            uName === cleanLogin;

          if (isIdentifierMatch && user.parol_hash) {
            const isMatch = bcrypt.compareSync(cleanPassword, user.parol_hash);
            if (isMatch) {
              return {
                success: true,
                adminInfo: {
                  name: user.ism || 'Bosh Administrator',
                  phone: user.telefon || cleanLogin
                }
              };
            }
          }
        }
      }

      // 2. Edge function mavjud bo'lsa
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-auth', {
          body: { login: cleanLogin, password: cleanPassword }
        });
        if (!edgeError && edgeData?.success) {
          return {
            success: true,
            adminInfo: {
              name: 'Bosh Administrator',
              phone: cleanLogin
            }
          };
        }
      } catch {}

    } catch (err: any) {
      console.warn('[Admin Auth] Supabase xatosi:', err);
    }
  }

  // 3. Local fallback (agar baza ulanmagan bo'lsa)
  const localUsers = getStoredUsers();
  const cleanPhoneDigits = cleanLogin.replace(/[^\d]/g, '');
  const localAdmin = localUsers.find(
    u => {
      if (!u.is_admin) return false;
      const uPhoneDigits = (u.telefon || '').replace(/[^\d]/g, '');
      const uEmail = (u.email || '').toLowerCase();
      const uEmailPrefix = uEmail.split('@')[0];
      const uName = (u.ism || '').toLowerCase();
      const uPhone = (u.telefon || '').replace(/\s+/g, '').toLowerCase();

      return (
        (cleanPhoneDigits.length >= 9 && uPhoneDigits === cleanPhoneDigits) ||
        uPhone === cleanLogin ||
        uEmail === cleanLogin ||
        uEmailPrefix === cleanLogin ||
        uName === cleanLogin
      );
    }
  );

  if (localAdmin) {
    const isPassOk =
      localAdmin.parol === cleanPassword ||
      (localAdmin.parol && bcrypt.compareSync(cleanPassword, localAdmin.parol));
    if (isPassOk) {
      return {
        success: true,
        adminInfo: {
          name: localAdmin.ism,
          phone: localAdmin.telefon
        }
      };
    }
  }

  return {
    success: false,
    error: 'Xato! Admin logini yoki parol noto\'g\'ri kiritildi.'
  };
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

// 5. Barcha foydalanuvchilarni olish (parollarsiz, xavfsiz)
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
          parol: undefined,
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
    parol: undefined,
    listings_count: listings.filter(l => l.user_id === u.id).length
  }));
};

// 6. Admin tomonidan foydalanuvchi ma'lumotlarini to'g'ridan-to'g'ri tahrirlash (Bcrypt xeshlash bilan)
export const updateAdminUser = async (userId: string, data: Partial<User>): Promise<boolean> => {
  const supabase = getSupabase();
  const passHash = data.parol && data.parol.trim() ? hashPassword(data.parol.trim()) : undefined;

  if (supabase) {
    try {
      const updatePayload: Record<string, any> = {
        ism: data.ism,
        telefon: data.telefon,
        email: data.email,
        is_admin: data.is_admin,
        is_blocked: data.is_blocked
      };
      if (passHash) {
        updatePayload.parol_hash = passHash;
      }

      await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId);
    } catch (e) {
      console.warn('Supabase updateAdminUser error:', e);
    }
  }

  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = {
      ...users[index],
      ...data,
      parol: undefined
    };
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
