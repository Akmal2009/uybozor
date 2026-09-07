import { Listing, User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-1',
    ism: 'Bosh Administrator',
    telefon: '+998 90 123 45 67',
    email: 'admin@arzonuy.uz',
    parol: 'UyBozor#2026!AdminSecure',
    is_admin: true,
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
    yaratilgan_sana: new Date().toISOString()
  }
];

export const INITIAL_LISTINGS: Listing[] = [];

