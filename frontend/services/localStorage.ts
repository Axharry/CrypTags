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

// Simple localStorage wrapper that works on web
const storage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Storage getItem error:', e);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  },
  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.values(KEYS).forEach(key => {
          window.localStorage.removeItem(key);
        });
      }
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  }
};

// =====================================
// CONTACTS
// =====================================

export const contactsStorage = {
  getAll(): Contact[] {
    try {
      const data = storage.getItem(KEYS.CONTACTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  },

  getOne(id: string): Contact | null {
    const contacts = this.getAll();
    return contacts.find(c => c.id === id) || null;
  },

  create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
    const contacts = this.getAll();
    const newContact: Contact = {
      ...contact,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    contacts.push(newContact);
    storage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    return newContact;
  },

  update(id: string, updates: Partial<Contact>): Contact | null {
    const contacts = this.getAll();
    const index = contacts.findIndex(c => c.id === id);
    if (index === -1) return null;

    contacts[index] = {
      ...contacts[index],
      ...updates,
      id: contacts[index].id,
      created_at: contacts[index].created_at,
      updated_at: new Date().toISOString(),
    };

    storage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    return contacts[index];
  },

  delete(id: string): boolean {
    const contacts = this.getAll();
    const filtered = contacts.filter(c => c.id !== id);
    if (filtered.length === contacts.length) return false;
    storage.setItem(KEYS.CONTACTS, JSON.stringify(filtered));
    return true;
  },

  toggleFavorite(id: string): Contact | null {
    const contact = this.getOne(id);
    if (!contact) return null;
    return this.update(id, { is_favorite: !contact.is_favorite });
  },

  search(query?: {
    search?: string;
    crypto_type?: string;
    favorites_only?: boolean;
    group_id?: string;
    sort_by?: string;
  }): Contact[] {
    let contacts = this.getAll();

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

  merge(data: {
    primary_contact_id: string;
    source_contact_ids: string[];
    delete_source_contacts?: boolean;
  }): Contact | null {
    const contacts = this.getAll();
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

      if (source.notes) {
        mergedNotesParts.push(`[From ${source.name}]: ${source.notes}`);
      }

      source.group_ids?.forEach(gid => mergedGroupIds.add(gid));
    });

    // Update primary contact
    const updatedPrimary = this.update(data.primary_contact_id, {
      crypto_addresses: mergedAddresses,
      notes: mergedNotesParts.filter(Boolean).join('\n') || undefined,
      group_ids: Array.from(mergedGroupIds),
    });

    // Delete source contacts if requested
    if (data.delete_source_contacts) {
      for (const sourceId of data.source_contact_ids) {
        this.delete(sourceId);
      }
    }

    return updatedPrimary;
  },
};

// =====================================
// GROUPS
// =====================================

export const groupsStorage = {
  getAll(): Group[] {
    try {
      const data = storage.getItem(KEYS.GROUPS);
      const groups: Group[] = data ? JSON.parse(data) : [];
      
      // Calculate contact counts
      const contacts = contactsStorage.getAll();
      return groups.map(group => ({
        ...group,
        contact_count: contacts.filter(c => c.group_ids?.includes(group.id)).length,
      }));
    } catch (error) {
      console.error('Error loading groups:', error);
      return [];
    }
  },

  getOne(id: string): Group | null {
    const groups = this.getAll();
    return groups.find(g => g.id === id) || null;
  },

  create(group: { name: string; description?: string; image?: string }): Group {
    const data = storage.getItem(KEYS.GROUPS);
    const groupsList: Group[] = data ? JSON.parse(data) : [];
    
    const newGroup: Group = {
      ...group,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      user_id: 'local',
      contact_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    groupsList.push(newGroup);
    storage.setItem(KEYS.GROUPS, JSON.stringify(groupsList));
    return newGroup;
  },

  update(id: string, updates: Partial<Group>): Group | null {
    const data = storage.getItem(KEYS.GROUPS);
    const groupsList: Group[] = data ? JSON.parse(data) : [];
    const index = groupsList.findIndex(g => g.id === id);
    
    if (index === -1) return null;

    groupsList[index] = {
      ...groupsList[index],
      ...updates,
      id: groupsList[index].id,
      created_at: groupsList[index].created_at,
      updated_at: new Date().toISOString(),
    };

    storage.setItem(KEYS.GROUPS, JSON.stringify(groupsList));
    return groupsList[index];
  },

  delete(id: string): boolean {
    const data = storage.getItem(KEYS.GROUPS);
    const groupsList: Group[] = data ? JSON.parse(data) : [];
    const filtered = groupsList.filter(g => g.id !== id);
    
    if (filtered.length === groupsList.length) return false;

    // Remove group from all contacts
    const contacts = contactsStorage.getAll();
    for (const contact of contacts) {
      if (contact.group_ids?.includes(id)) {
        contactsStorage.update(contact.id, {
          group_ids: contact.group_ids.filter(gid => gid !== id),
        });
      }
    }

    storage.setItem(KEYS.GROUPS, JSON.stringify(filtered));
    return true;
  },

  addContact(groupId: string, contactId: string): boolean {
    const contact = contactsStorage.getOne(contactId);
    if (!contact) return false;

    const groupIds = contact.group_ids || [];
    if (!groupIds.includes(groupId)) {
      contactsStorage.update(contactId, {
        group_ids: [...groupIds, groupId],
      });
    }
    return true;
  },

  removeContact(groupId: string, contactId: string): boolean {
    const contact = contactsStorage.getOne(contactId);
    if (!contact) return false;

    contactsStorage.update(contactId, {
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
  getAll(): { default_cryptos: typeof DEFAULT_CRYPTOS; custom_cryptos: CustomCrypto[] } {
    try {
      const data = storage.getItem(KEYS.CUSTOM_CRYPTOS);
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

  create(crypto: { name: string; symbol: string; address_regex?: string }): CustomCrypto {
    const data = storage.getItem(KEYS.CUSTOM_CRYPTOS);
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
    storage.setItem(KEYS.CUSTOM_CRYPTOS, JSON.stringify(cryptos));
    return newCrypto;
  },

  delete(id: string): boolean {
    const data = storage.getItem(KEYS.CUSTOM_CRYPTOS);
    const cryptos: CustomCrypto[] = data ? JSON.parse(data) : [];
    const filtered = cryptos.filter(c => c.id !== id);
    
    if (filtered.length === cryptos.length) return false;
    storage.setItem(KEYS.CUSTOM_CRYPTOS, JSON.stringify(filtered));
    return true;
  },

  validateAddress(address: string, cryptoSymbol: string): boolean {
    const allCryptos = [...DEFAULT_CRYPTOS];
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
  exportJSON(): { contacts: Contact[]; groups: Group[]; exported_at: string } {
    const contacts = contactsStorage.getAll();
    const groups = groupsStorage.getAll();
    
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

  exportCSV(): { csv_content: string; exported_at: string } {
    const contacts = contactsStorage.getAll();
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
  isEnabled(): boolean {
    const enabled = storage.getItem(KEYS.APP_LOCK_ENABLED);
    return enabled === 'true';
  },

  setEnabled(enabled: boolean): void {
    storage.setItem(KEYS.APP_LOCK_ENABLED, enabled.toString());
  },

  setPin(pin: string): void {
    storage.setItem(KEYS.APP_LOCK_PIN, pin);
  },

  verifyPin(pin: string): boolean {
    const stored = storage.getItem(KEYS.APP_LOCK_PIN);
    return stored === pin;
  },

  clearPin(): void {
    storage.removeItem(KEYS.APP_LOCK_PIN);
  },

  isBiometricEnabled(): boolean {
    const enabled = storage.getItem(KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  },

  setBiometricEnabled(enabled: boolean): void {
    storage.setItem(KEYS.BIOMETRIC_ENABLED, enabled.toString());
  },
};

// =====================================
// CLEAR ALL DATA
// =====================================

export const clearAllData = (): void => {
  storage.clear();
};
