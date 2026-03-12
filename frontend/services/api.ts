import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Contact API
export interface CryptoAddress {
  id: string;
  crypto_type: string;
  address: string;
  label?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  notes?: string;
  profile_picture?: string;
  crypto_addresses: CryptoAddress[];
  is_favorite: boolean;
  group_ids: string[];
  created_at: string;
  updated_at: string;
}

export type SortOption = 'name_asc' | 'name_desc' | 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc';

export const contactsAPI = {
  getAll: (params?: { 
    search?: string; 
    crypto_type?: string; 
    favorites_only?: boolean;
    group_id?: string;
    sort_by?: SortOption;
  }) => api.get<Contact[]>('/contacts', { params }),
  getOne: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: Partial<Contact>) => api.post<Contact>('/contacts', data),
  update: (id: string, data: Partial<Contact>) => api.put<Contact>(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  toggleFavorite: (id: string) => api.put<Contact>(`/contacts/${id}/favorite`),
  merge: (data: { primary_contact_id: string; source_contact_ids: string[]; delete_source_contacts?: boolean }) =>
    api.post<Contact>('/contacts/merge', data),
};

// Group API
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

export const groupsAPI = {
  getAll: () => api.get<Group[]>('/groups'),
  getOne: (id: string) => api.get<Group>(`/groups/${id}`),
  create: (data: { name: string; description?: string; image?: string }) =>
    api.post<Group>('/groups', data),
  update: (id: string, data: { name?: string; description?: string; image?: string }) =>
    api.put<Group>(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  addContact: (groupId: string, contactId: string) =>
    api.post(`/groups/${groupId}/contacts/${contactId}`),
  removeContact: (groupId: string, contactId: string) =>
    api.delete(`/groups/${groupId}/contacts/${contactId}`),
};

// Crypto API
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

export const cryptosAPI = {
  getAll: () => api.get<{ default_cryptos: DefaultCrypto[]; custom_cryptos: CustomCrypto[] }>('/cryptos'),
  create: (data: { name: string; symbol: string; address_regex?: string }) =>
    api.post<CustomCrypto>('/cryptos', data),
  delete: (id: string) => api.delete(`/cryptos/${id}`),
};

// Export API
export const exportAPI = {
  exportJSON: () => api.get('/export/json'),
  exportCSV: () => api.get('/export/csv'),
};

// Validation API
export const validationAPI = {
  validateAddress: (crypto_type: string, address: string) =>
    api.post('/validate-address', null, { params: { crypto_type, address } }),
};

export default api;
