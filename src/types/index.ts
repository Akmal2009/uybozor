export type ListingType = 'sotuv' | 'ijara';
export type ListingStatus = 'kutilmoqda' | 'faol' | 'rad_etildi' | 'sotilgan' | 'nobakor';
export type PaymentProvider = 'Payme' | 'Click' | 'Uzum';
export type PaymentStatus = 'kutilmoqda' | 'tolandi' | 'bekor_qilindi' | 'xatolik';
export type Currency = 'USD' | 'UZS';

export interface User {
  id: string;
  ism: string;
  telefon: string;
  email?: string;
  parol?: string;
  avatar_url?: string;
  is_admin?: boolean;
  is_blocked?: boolean;
  yaratilgan_sana: string;
}

export interface LoginRequest {
  id: string;
  status: 'kutilmoqda' | 'tasdiqlangan' | 'rad_etilgan';
  user_id?: string;
  user_name?: string;
  user_phone?: string;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  turi: ListingType;
  rasmlar: string[];
  manzil_matn: string;
  manzil_lat: number;
  manzil_lng: number;
  shahar: string;
  viloyat?: string;
  tuman?: string;
  mahalla?: string;
  qavat: number;
  umumiy_qavat: number;
  maydon: number; // m²
  xonalar_soni: number;
  narx: number;
  valyuta: Currency;
  izoh?: string;
  telefon: string;
  holat: ListingStatus;
  is_vip?: boolean;
  views_count?: number;
  yaratilgan_sana: string;
  // Qo'shimcha qulayliklar
  tamiri?: 'Yevro ta\'mir' | 'O\'rtacha' | 'Ta\'mirsiz' | 'Mualliflik loyihasi';
  bino_turi?: 'G\'ishtli' | 'Monolit' | 'Panelli';
  mebel?: boolean;
  texnika?: boolean;
  can_edit?: boolean;
  edit_requested?: boolean;
  vip_requested?: boolean;
}

export interface Payment {
  id: string;
  listing_id: string;
  user_id: string;
  summa: number;
  holat: PaymentStatus;
  tolov_provayderi: PaymentProvider;
  transaction_id?: string;
  sana: string;
  listing_title?: string;
}

export interface FilterState {
  turi: ListingType | 'barchasi';
  viloyat?: string;
  shahar: string;
  tuman?: string;
  xonalar_soni: number | 'barchasi';
  minNarx?: number;
  maxNarx?: number;
  minMaydon?: number;
  maxMaydon?: number;
  qavat?: number;
  searchQuery: string;
  sortBy: 'yangi' | 'arzon' | 'qimmat' | 'maydon_katta';
}
