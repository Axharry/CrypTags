import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Contact, Group, CustomCrypto, CryptoAddress } from '../types';

// Storage Keys
const KEYS = {
  CONTACTS: 'cryptags_contacts',
  GROUPS: 'cryptags_groups',
  CUSTOM_CRYPTOS: 'cryptags_custom_cryptos',
  APP_LOCK_ENABLED: 'cryptags_app_lock_enabled',
  APP_LOCK_PIN: 'cryptags_app_lock_pin',
  BIOMETRIC_ENABLED: 'cryptags_biometric_enabled',
  THEME: 'cryptags_theme',
};

// Storage utility (SecureStore for native, AsyncStorage for web)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// =====================================
// CONTACTS
// =====================================

export const contactsStorage = {
  async getAll(): Promise<Contact[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CONTACTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  },

  async getOne(id: string): Promise<Contact | null> {
    const contacts = await this.getAll();
    return contacts.find(c => c.id === id) || null;
  },

  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const contacts = await this.getAll();
    const newContact: Contact = {
      ...contact,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    contacts.push(newContact);
    await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    return newContact;
  },

  async update(id: string, updates: Partial<Contact>): Promise<Contact | null> {
    const contacts = await this.getAll();
    const index = contacts.findIndex(c => c.id === id);
    if (index === -1) return null;

    contacts[index] = {
      ...contacts[index],
      ...updates,
      id: contacts[index].id, // Preserve ID
      created_at: contacts[index].created_at, // Preserve created_at
      updated_at: new Date().toISOString(),
    };

    await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    return contacts[index];
  },

  async delete(id: string): Promise<boolean> {
    const contacts = await this.getAll();
    const filtered = contacts.filter(c => c.id !== id);
    if (filtered.length === contacts.length) return false;
    await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(filtered));
    return true;
  },

  async toggleFavorite(id: string): Promise<Contact | null> {
    const contact = await this.getOne(id);
    if (!contact) return null;
    return this.update(id, { is_favorite: !contact.is_favorite });
  },

  async search(query?: {
    search?: string;
    crypto_type?: string;
    favorites_only?: boolean;
    group_id?: string;
    sort_by?: string;
  }): Promise<Contact[]> {
    let contacts = await this.getAll();

    // If no query provided, return all contacts
    if (!query) {
      return contacts;
    }

    // Filter by favorites
    if (query.favorites_only) {
      contacts = contacts.filter(c => c.is_favorite);
    }

    // Filter by group
    if (query.group_id) {
      contacts = contacts.filter(c => c.group_ids?.includes(query.group_id!));
    }

    // Filter by crypto type
    if (query.crypto_type) {
      contacts = contacts.filter(c =>
        c.crypto_addresses?.some(addr => addr.crypto_type.toLowerCase() === query.crypto_type!.toLowerCase())
      );
    }

    // Search filter
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      contacts = contacts.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(searchLower);
        const addressMatch = c.crypto_addresses?.some(addr =>
          addr.address.toLowerCase().includes(searchLower) ||
          addr.crypto_type.toLowerCase().includes(searchLower) ||
          addr.label?.toLowerCase().includes(searchLower)
        );
        const notesMatch = c.notes?.toLowerCase().includes(searchLower);
        return nameMatch || addressMatch || notesMatch;
      });
    }

    // Sort
    const sortBy = query.sort_by || 'name_asc';
    contacts.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        default:
          return 0;
      }
    });

    return contacts;
  },

  async merge(data: {
    primary_contact_id: string;
    source_contact_ids: string[];
    delete_source_contacts?: boolean;
  }): Promise<Contact | null> {
    const contacts = await this.getAll();
    const primary = contacts.find(c => c.id === data.primary_contact_id);
    if (!primary) return null;

    const sources = contacts.filter(c => data.source_contact_ids.includes(c.id));
    if (sources.length === 0) return null;

    // Merge addresses
    const existingAddresses = new Set(
      primary.crypto_addresses.map(addr => `${addr.crypto_type}:${addr.address}`)
    );

    const mergedAddresses = [...primary.crypto_addresses];
    const mergedNotesParts = [primary.notes || ''];
    const mergedGroupIds = new Set(primary.group_ids || []);

    sources.forEach(source => {
      // Merge addresses
      source.crypto_addresses.forEach(addr => {
        const key = `${addr.crypto_type}:${addr.address}`;
        if (!existingAddresses.has(key)) {
          mergedAddresses.push({
            ...addr,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            label: addr.label || `From ${source.name}`,
          });
          existingAddresses.add(key);
        }
      });

      // Merge notes
      if (source.notes) {
        mergedNotesParts.push(`[From ${source.name}]: ${source.notes}`);
      }

      // Merge groups
      source.group_ids?.forEach(gid => mergedGroupIds.add(gid));
    });

    // Update primary contact
    const updatedPrimary = await this.update(data.primary_contact_id, {
      crypto_addresses: mergedAddresses,
      notes: mergedNotesParts.filter(Boolean).join('\n') || undefined,
      group_ids: Array.from(mergedGroupIds),
    });

    // Delete source contacts if requested
    if (data.delete_source_contacts) {
      for (const sourceId of data.source_contact_ids) {
        await this.delete(sourceId);
      }
    }

    return updatedPrimary;
  },
};

// =====================================
// GROUPS
// =====================================

export const groupsStorage = {
  async getAll(): Promise<Group[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.GROUPS);
      const groups: Group[] = data ? JSON.parse(data) : [];
      
      // Calculate contact counts
      const contacts = await contactsStorage.getAll();
      return groups.map(group => ({
        ...group,
        contact_count: contacts.filter(c => c.group_ids?.includes(group.id)).length,
      }));
    } catch (error) {
      console.error('Error loading groups:', error);
      return [];
    }
  },

  async getOne(id: string): Promise<Group | null> {
    const groups = await this.getAll();
    return groups.find(g => g.id === id) || null;
  },

  async create(group: { name: string; description?: string; image?: string }): Promise<Group> {
    const groups = await AsyncStorage.getItem(KEYS.GROUPS);
    const groupsList: Group[] = groups ? JSON.parse(groups) : [];
    
    const newGroup: Group = {
      ...group,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      user_id: 'local',
      contact_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    groupsList.push(newGroup);
    await AsyncStorage.setItem(KEYS.GROUPS, JSON.stringify(groupsList));
    return newGroup;
  },

  async update(id: string, updates: Partial<Group>): Promise<Group | null> {
    const groups = await AsyncStorage.getItem(KEYS.GROUPS);
    const groupsList: Group[] = groups ? JSON.parse(groups) : [];
    const index = groupsList.findIndex(g => g.id === id);
    
    if (index === -1) return null;

    groupsList[index] = {
      ...groupsList[index],
      ...updates,
      id: groupsList[index].id,
      created_at: groupsList[index].created_at,
      updated_at: new Date().toISOString(),
    };

    await AsyncStorage.setItem(KEYS.GROUPS, JSON.stringify(groupsList));
    return groupsList[index];
  },

  async delete(id: string): Promise<boolean> {
    const groups = await AsyncStorage.getItem(KEYS.GROUPS);
    const groupsList: Group[] = groups ? JSON.parse(groups) : [];
    const filtered = groupsList.filter(g => g.id !== id);
    
    if (filtered.length === groupsList.length) return false;

    // Remove group from all contacts
    const contacts = await contactsStorage.getAll();
    for (const contact of contacts) {
      if (contact.group_ids?.includes(id)) {
        await contactsStorage.update(contact.id, {
          group_ids: contact.group_ids.filter(gid => gid !== id),
        });
      }
    }

    await AsyncStorage.setItem(KEYS.GROUPS, JSON.stringify(filtered));
    return true;
  },

  async addContact(groupId: string, contactId: string): Promise<boolean> {
    const contact = await contactsStorage.getOne(contactId);
    if (!contact) return false;

    const groupIds = contact.group_ids || [];
    if (!groupIds.includes(groupId)) {
      await contactsStorage.update(contactId, {
        group_ids: [...groupIds, groupId],
      });
    }
    return true;
  },

  async removeContact(groupId: string, contactId: string): Promise<boolean> {
    const contact = await contactsStorage.getOne(contactId);
    if (!contact) return false;

    await contactsStorage.update(contactId, {
      group_ids: (contact.group_ids || []).filter(gid => gid !== groupId),
    });
    return true;
  },
};

// =====================================
// CUSTOM CRYPTOS
// =====================================

export const DEFAULT_CRYPTOS = [
  { name: 'Bitcoin', symbol: 'BTC', address_regex: '^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$' },
  { name: 'Ethereum', symbol: 'ETH', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'USDT (ERC-20)', symbol: 'USDT', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'Solana', symbol: 'SOL', address_regex: '^[1-9A-HJ-NP-Za-km-z]{32,44}$' },
  { name: 'BNB Smart Chain', symbol: 'BNB', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'Polygon', symbol: 'MATIC', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'Avalanche', symbol: 'AVAX', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'Arbitrum', symbol: 'ARB', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'Optimism', symbol: 'OP', address_regex: '^0x[a-fA-F0-9]{40}$' },
  { name: 'Tron', symbol: 'TRX', address_regex: '^T[a-zA-HJ-NP-Z0-9]{33}$' },
];

export const cryptosStorage = {
  async getAll(): Promise<{ default_cryptos: typeof DEFAULT_CRYPTOS; custom_cryptos: CustomCrypto[] }> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CUSTOM_CRYPTOS);
      const custom_cryptos = data ? JSON.parse(data) : [];
      return {
        default_cryptos: DEFAULT_CRYPTOS,
        custom_cryptos,
      };
    } catch (error) {
      console.error('Error loading cryptos:', error);
      return { default_cryptos: DEFAULT_CRYPTOS, custom_cryptos: [] };
    }
  },

  async create(crypto: { name: string; symbol: string; address_regex?: string }): Promise<CustomCrypto> {
    const data = await AsyncStorage.getItem(KEYS.CUSTOM_CRYPTOS);
    const cryptos: CustomCrypto[] = data ? JSON.parse(data) : [];

    // Check for duplicates
    if (cryptos.some(c => c.symbol.toUpperCase() === crypto.symbol.toUpperCase())) {
      throw new Error('Crypto with this symbol already exists');
    }

    // Check against defaults
    if (DEFAULT_CRYPTOS.some(c => c.symbol.toUpperCase() === crypto.symbol.toUpperCase())) {
      throw new Error('Cannot override default cryptocurrency');
    }

    const newCrypto: CustomCrypto = {
      ...crypto,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      user_id: 'local',
      symbol: crypto.symbol.toUpperCase(),
      created_at: new Date().toISOString(),
    };

    cryptos.push(newCrypto);
    await AsyncStorage.setItem(KEYS.CUSTOM_CRYPTOS, JSON.stringify(cryptos));
    return newCrypto;
  },

  async delete(id: string): Promise<boolean> {
    const data = await AsyncStorage.getItem(KEYS.CUSTOM_CRYPTOS);
    const cryptos: CustomCrypto[] = data ? JSON.parse(data) : [];
    const filtered = cryptos.filter(c => c.id !== id);
    
    if (filtered.length === cryptos.length) return false;
    await AsyncStorage.setItem(KEYS.CUSTOM_CRYPTOS, JSON.stringify(filtered));
    return true;
  },

  validateAddress(address: string, cryptoSymbol: string): boolean {
    const { default_cryptos, custom_cryptos } = this.getAll() as any;
    const allCryptos = [...default_cryptos, ...custom_cryptos];
    const crypto = allCryptos.find(c => c.symbol.toUpperCase() === cryptoSymbol.toUpperCase());

    if (!crypto || !crypto.address_regex) return true;

    try {
      const regex = new RegExp(crypto.address_regex);
      return regex.test(address);
    } catch {
      return true;
    }
  },
};

// =====================================
// EXPORT
// =====================================

export const exportStorage = {
  async exportJSON(): Promise<{ contacts: Contact[]; groups: Group[]; exported_at: string }> {
    const contacts = await contactsStorage.getAll();
    const groups = await groupsStorage.getAll();
    
    return {
      contacts: contacts.map(c => ({
        ...c,
        user_id: undefined as any,
      })),
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
      })) as any,
      exported_at: new Date().toISOString(),
    };
  },

  async exportCSV(): Promise<{ csv_content: string; exported_at: string }> {
    const contacts = await contactsStorage.getAll();
    const csvLines = ['Name,Crypto Type,Address,Label,Notes,Is Favorite,Groups'];

    for (const contact of contacts) {
      const groupsStr = contact.group_ids?.join(';') || '';
      
      if (contact.crypto_addresses && contact.crypto_addresses.length > 0) {
        for (const addr of contact.crypto_addresses) {
          const line = `"${contact.name}","${addr.crypto_type}","${addr.address}","${addr.label || ''}","${contact.notes || ''}","${contact.is_favorite}","${groupsStr}"`;
          csvLines.push(line);
        }
      } else {
        const line = `"${contact.name}","","","","${contact.notes || ''}","${contact.is_favorite}","${groupsStr}"`;
        csvLines.push(line);
      }
    }

    return {
      csv_content: csvLines.join('\n'),
      exported_at: new Date().toISOString(),
    };
  },
};

// =====================================
// APP LOCK (Security)
// =====================================

export const appLockStorage = {
  async isEnabled(): Promise<boolean> {
    const enabled = await storage.getItem(KEYS.APP_LOCK_ENABLED);
    return enabled === 'true';
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await storage.setItem(KEYS.APP_LOCK_ENABLED, enabled.toString());
  },

  async setPin(pin: string): Promise<void> {
    await storage.setItem(KEYS.APP_LOCK_PIN, pin);
  },

  async verifyPin(pin: string): Promise<boolean> {
    const stored = await storage.getItem(KEYS.APP_LOCK_PIN);
    return stored === pin;
  },

  async clearPin(): Promise<void> {
    await storage.deleteItem(KEYS.APP_LOCK_PIN);
  },

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await storage.getItem(KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await storage.setItem(KEYS.BIOMETRIC_ENABLED, enabled.toString());
  },
};
