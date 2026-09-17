import { User } from '../types';
import { INITIAL_USERS } from './mockData';
import { getSupabase } from './supabase';
import bcrypt from 'bcryptjs';

/**
 * Parolni xavfsiz hashlash (bcrypt)
 */
export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

/**
 * Parolni tekshirish (bcrypt yoki legacy base64 orqali)
 */
export const comparePassword = (password: string, hashOrEncoded: string): boolean => {
  if (!hashOrEncoded) return false;

  // 1. Agar bcrypt hash ($2a$, $2b$, $2y$) bo'lsa
  if (hashOrEncoded.startsWith('$2a$') || hashOrEncoded.startsWith('$2b$') || hashOrEncoded.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(password, hashOrEncoded);
    } catch {
      return false;
    }
  }

  // 2. Eski tizim (btoa / base64) bilan moslashuvchanlik
  try {
    if (atob(hashOrEncoded) === password) {
      return true;
    }
  } catch {}

  // 3. To'g'ridan-to'g'ri solishtirish (agar test baza ochiq matnda qolgan bo'lsa)
  return hashOrEncoded === password;
};

const USERS_STORAGE_KEY = 'uybozor_users';
const CURRENT_USER_KEY = 'uybozor_current_user';

// Boshlang'ich foydalanuvchilarni yuklash
export const getStoredUsers = (): User[] => {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_USERS;
  }
};

export const saveStoredUsers = (users: User[]) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

// 1. Yangi foydalanuvchini ro'yxatdan o'tkazish
export const registerUser = async (
  ism: string,
  telefon: string,
  email?: string,
  parol?: string
): Promise<User> => {
  const cleanPhone = telefon.replace(/\s+/g, '');
  const userPassword = parol || '123456';

  // Oldin ro'yxatdan o'tganligini tekshirish
  const localUsers = getStoredUsers();
  const alreadyExists = localUsers.some(
    u => u.telefon.replace(/\s+/g, '') === cleanPhone
  );

  if (alreadyExists) {
    throw new Error('Ushbu telefon raqam bilan allaqachon ro\'yxatdan o\'tilgan! Iltimos, Login va Parolingiz orqali kiring.');
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Supabase'da mavjudligini tekshirish
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('telefon', telefon)
        .single();

      if (existingUser) {
        throw new Error('Ushbu telefon raqam allaqachon ro\'yxatdan o\'tgan! Iltimos, login qiling.');
      }

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            ism,
            telefon,
            email: email || null,
            parol_hash: hashPassword(userPassword),
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ism)}`
          }
        ])
        .select()
        .single();

      if (!error && data) {
        const newUser: User = {
          id: data.id,
          ism: data.ism,
          telefon: data.telefon,
          email: data.email,
          parol: userPassword,
          avatar_url: data.avatar_url,
          yaratilgan_sana: data.yaratilgan_sana
        };
        const users = getStoredUsers();
        users.push(newUser);
        saveStoredUsers(users);
        setCurrentUser(newUser);
        return newUser;
      }
    } catch (e: any) {
      if (e.message && e.message.includes('allaqachon')) {
        throw e;
      }
      console.warn('Supabase register fallback to local:', e);
    }
  }

  const newUser: User = {
    id: 'usr-' + Date.now(),
    ism,
    telefon,
    email: email || '',
    parol: userPassword,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ism)}`,
    yaratilgan_sana: new Date().toISOString()
  };

  localUsers.push(newUser);
  saveStoredUsers(localUsers);
  setCurrentUser(newUser);
  return newUser;
};

// 2. Aniq Login va Parol bilan tizimga kirish (Tahminiy hisob yaratilmaydi!)
export const loginUser = async (
  telefonYokiEmail: string,
  kiritilganParol?: string
): Promise<User> => {
  const rawInput = telefonYokiEmail.trim();
  const digits = rawInput.replace(/[^\d]/g, '');
  const cleanInput = rawInput.replace(/\s+/g, '').toLowerCase();
  const supabase = getSupabase();

  let foundUser: User | null = null;
  let dbParolHash: string | null = null;

  if (supabase) {
    try {
      let query = supabase.from('users').select('*');
      if (digits.length >= 9) {
        query = query.or(`telefon.eq.${digits},telefon.eq.+${digits},telefon.eq.${cleanInput},email.eq.${cleanInput}`);
      } else {
        query = query.or(`telefon.eq.${cleanInput},email.eq.${cleanInput}`);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (!error && data) {
        foundUser = {
          id: data.id,
          ism: data.ism,
          telefon: data.telefon,
          email: data.email,
          parol: undefined, // Parol hech qachon client ob'ektida ochiq saqlanmaydi
          avatar_url: data.avatar_url,
          is_admin: data.is_admin,
          is_blocked: data.is_blocked,
          yaratilgan_sana: data.yaratilgan_sana
        };
        dbParolHash = data.parol_hash;
      }
    } catch (e) {
      // local fallback
    }
  }

  if (!foundUser) {
    const users = getStoredUsers();
    const localFound = users.find(
      u => {
        const uDigits = u.telefon ? u.telefon.replace(/[^\d]/g, '') : '';
        return (
          (digits.length >= 9 && uDigits === digits) ||
          u.telefon?.replace(/\s+/g, '').toLowerCase() === cleanInput ||
          u.email?.toLowerCase() === cleanInput
        );
      }
    );
    if (localFound) {
      foundUser = localFound;
    }
  }

  // AGAR FOYDALANUVCHI TOPILMASA -> XATOLIK QAYTARILADI (Tahminiy yangi profil OCHILMAYDI!)
  if (!foundUser) {
    throw new Error('Bunday foydalanuvchi topilmadi! Iltimos, telefon raqamingizni tekshiring yoki ro\'yxatdan o\'ting.');
  }

  // AGAR PAROL KIRITILGAN BO'LSA -> PAROLNI ANIQ TEKSHIRISH (BCRYPT)
  if (kiritilganParol !== undefined && kiritilganParol.trim() !== '') {
    const inputPass = kiritilganParol.trim();
    let isPasswordCorrect = false;

    if (dbParolHash && comparePassword(inputPass, dbParolHash)) {
      isPasswordCorrect = true;
    } else if (foundUser.parol && comparePassword(inputPass, foundUser.parol)) {
      isPasswordCorrect = true;
    }

    if (!isPasswordCorrect) {
      throw new Error('Kiritilgan parol noto\'g\'ri! Iltimos, qayta tekshiring yoki "Parolni unutdingizmi?" tugmasini bosing.');
    }
  }

  setCurrentUser(foundUser);
  return foundUser;
};

// 3. Parolni tiklash (SMS tasdiqlashdan so'ng yangi parol o'rnatish)
export const resetUserPassword = async (
  telefon: string,
  yangiParol: string
): Promise<User> => {
  const cleanPhone = telefon.replace(/\s+/g, '').toLowerCase();
  const supabase = getSupabase();

  const users = getStoredUsers();
  const index = users.findIndex(
    u => u.telefon.replace(/\s+/g, '').toLowerCase() === cleanPhone
  );

  if (index === -1) {
    throw new Error('Ushbu telefon raqam bilan ro\'yxatdan o\'tgan hisob topilmadi!');
  }

  if (supabase) {
    try {
      await supabase
        .from('users')
        .update({
          parol_hash: hashPassword(yangiParol)
        })
        .eq('id', users[index].id);
    } catch (e) {
      console.warn('Supabase reset password error:', e);
    }
  }

  users[index].parol = yangiParol;
  saveStoredUsers(users);
  setCurrentUser(users[index]);
  return users[index];
};

// 4. Foydalanuvchi o'z profilini yangilashi
export const updateUserProfile = async (
  userId: string,
  updatedData: Partial<User>
): Promise<User> => {
  const supabase = getSupabase();

  if (supabase) {
    try {
      await supabase
        .from('users')
        .update({
          ism: updatedData.ism,
          telefon: updatedData.telefon,
          email: updatedData.email,
          avatar_url: updatedData.avatar_url,
          parol_hash: updatedData.parol ? hashPassword(updatedData.parol) : undefined
        })
        .eq('id', userId);
    } catch (e) {
      console.warn('Supabase updateUserProfile error:', e);
    }
  }

  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updatedData };
    saveStoredUsers(users);
    setCurrentUser(users[index]);
    return users[index];
  }

  const curr = getCurrentUser();
  if (curr) {
    const updated = { ...curr, ...updatedData };
    setCurrentUser(updated);
    return updated;
  }

  throw new Error('Foydalanuvchi topilmadi');
};

export const logoutUser = () => {
  setCurrentUser(null);
};
