// Contact Types
export interface CryptoAddress {
  id: string;
  crypto_type: string;
  address: string;
  label?: string;
}

export interface Contact {
  id: string;
  user_id?: string;
  name: string;
  notes?: string;
  profile_picture?: string;
  crypto_addresses: CryptoAddress[];
  is_favorite: boolean;
  group_ids: string[];
  created_at: string;
  updated_at: string;
}

// Group Types
export interface Group {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  image?: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

// Crypto Types
export interface CustomCrypto {
  id: string;
  user_id: string;
  name: string;
  symbol: string;
  address_regex?: string;
  created_at: string;
}

export interface DefaultCrypto {
  name: string;
  symbol: string;
  address_regex?: string;
}

// Sort Types
export type SortOption = 'name_asc' | 'name_desc' | 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc';
