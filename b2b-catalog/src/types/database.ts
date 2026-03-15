export type UserRole = 'admin' | 'manager' | 'customer';

export type OfferStatus = 'draft' | 'active' | 'partially_sold' | 'sold_out' | 'archived';

export type ConditionCode = 'A' | 'B' | 'C' | 'D';

export type UnitType = 'kg' | 'Stück' | 'Palette' | 'Posten' | 'Set';

export type Currency = 'EUR' | 'USD';

export type Language = 'de' | 'en' | 'ru';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  whatsapp_number?: string;
  created_at: string;
}

export interface ManagerProfile {
  id: string;
  user_id: string;
  display_name: string;
  whatsapp_number: string;
  default_language: Language;
  created_at: string;
}

export interface Category {
  id: string;
  name_de: string;
  name_en: string;
  name_ru: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface Offer {
  id: string;
  title: string;
  brand: string;
  short_description: string;
  long_description: string;
  quantity_total: number;
  quantity_available: number;
  unit: UnitType;
  volume_text: string;
  price_per_unit: number;
  currency: Currency;
  condition_code: ConditionCode;
  category_id: string;
  export_only: boolean;
  public_visible: boolean;
  min_price_internal: number;
  in_stock: boolean;
  status: OfferStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OfferTranslation {
  id: string;
  offer_id: string;
  language: Language;
  title: string;
  short_description: string;
  long_description: string;
}

export interface OfferArticleNumber {
  id: string;
  offer_id: string;
  article_number: string;
}

export interface OfferImage {
  id: string;
  offer_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface ShareLink {
  id: string;
  token: string;
  manager_id: string;
  label: string;
  filters: ShareLinkFilters;
  default_language: Language;
  active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface ShareLinkFilters {
  category_ids?: string[];
  condition_codes?: ConditionCode[];
  export_only?: boolean;
}

export interface Inquiry {
  id: string;
  share_link_id: string;
  manager_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  message: string;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export interface InquiryItem {
  id: string;
  inquiry_id: string;
  offer_id: string;
  requested_quantity: number;
  unit: UnitType;
  price_per_unit: number;
}

export interface StockMovement {
  id: string;
  offer_id: string;
  quantity_change: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface CartItem {
  offer: Offer & {
    category?: Category;
    images?: OfferImage[];
    article_numbers?: OfferArticleNumber[];
  };
  quantity: number;
}
