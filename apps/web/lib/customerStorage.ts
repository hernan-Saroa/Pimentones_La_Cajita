/**
 * customerStorage.ts
 * 
 * Gestión inteligente y segura de datos del cliente en el dispositivo (LocalStorage):
 * 1. Historial de pedidos realizados desde este navegador con estado en vivo.
 * 2. Perfil del comprador (Nombre, Teléfono, Correo, Cédula/NIT).
 * 3. Libreta de direcciones guardadas (Casa, Oficina, etc.) con selección en 1 clic en checkout.
 * 
 * Cumple con principios de privacidad (Ley 1581 / Habeas Data): datos almacenados
 * exclusivamente en el cliente, con opción de borrado completo cuando el usuario lo desee.
 */

export type SavedOrder = {
  reference: string;
  email: string;
  date: string;          // ISO string
  total?: number;        // COP
  itemsSummary?: string; // ej: "2x Mayonesa de Pimentón, 1x Salsa Rústica"
  itemCount?: number;
  status?: string;       // 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'failed' | 'cancelled' | 'refunded'
  city?: string;
  department?: string;
};

export type SavedAddress = {
  id: string;
  label: string;         // 'Dirección habitual', 'Casa', 'Oficina', etc.
  address: string;
  address2?: string;
  city: string;
  department: string;
  notes?: string;
  isDefault?: boolean;
};

export type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
  doc?: string;
  addresses: SavedAddress[];
  defaultAddressId?: string;
  updatedAt: string;
};

const ORDERS_KEY = 'lacajita_orders_history';
const PROFILE_KEY = 'lacajita_customer_profile';
const LEGACY_SAVED_KEY = 'lacajita.customer';
const RECENT_REF_KEY = 'lacajita_recent_ref';
const RECENT_EMAIL_KEY = 'lacajita_recent_email';

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'localStorage' in window;
  } catch {
    return false;
  }
}

// ==========================================
// 1. HISTORIAL DE PEDIDOS
// ==========================================

export function getOrderHistory(): SavedOrder[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      // Migración desde legacy ref si existe
      const legacyRef = localStorage.getItem(RECENT_REF_KEY);
      const legacyEmail = localStorage.getItem(RECENT_EMAIL_KEY);
      if (legacyRef && legacyEmail) {
        const item: SavedOrder = {
          reference: legacyRef,
          email: legacyEmail,
          date: new Date().toISOString(),
          status: 'pending',
        };
        saveOrderToHistory(item);
        return [item];
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: SavedOrder): void {
  if (!isStorageAvailable() || !order.reference) return;
  try {
    const history = getOrderHistory();
    const existingIndex = history.findIndex((o) => o.reference.toUpperCase() === order.reference.toUpperCase());

    const updatedOrder: SavedOrder = {
      ...order,
      reference: order.reference.trim().toUpperCase(),
      email: order.email.trim().toLowerCase(),
      date: order.date || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      history[existingIndex] = {
        ...history[existingIndex],
        ...updatedOrder,
        // Conservar fecha original si ya existía
        date: history[existingIndex].date || updatedOrder.date,
      };
    } else {
      history.unshift(updatedOrder);
    }

    // Limitar historial a los últimos 30 pedidos
    const trimmed = history.slice(0, 30);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(trimmed));

    // Mantener sincronizado el puntero del pedido más reciente
    localStorage.setItem(RECENT_REF_KEY, updatedOrder.reference);
    localStorage.setItem(RECENT_EMAIL_KEY, updatedOrder.email);
  } catch {
    // Silencioso ante cuotas de storage
  }
}

export function updateOrderHistoryStatus(
  reference: string,
  status: string,
  total?: number,
  city?: string,
  department?: string
): void {
  if (!isStorageAvailable() || !reference) return;
  try {
    const history = getOrderHistory();
    const idx = history.findIndex((o) => o.reference.toUpperCase() === reference.toUpperCase());
    if (idx >= 0) {
      history[idx].status = status;
      if (total !== undefined) history[idx].total = total;
      if (city) history[idx].city = city;
      if (department) history[idx].department = department;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(history));
    }
  } catch {
    // Silencioso
  }
}

export function removeOrderFromHistory(reference: string): void {
  if (!isStorageAvailable() || !reference) return;
  try {
    const history = getOrderHistory().filter((o) => o.reference.toUpperCase() !== reference.toUpperCase());
    localStorage.setItem(ORDERS_KEY, JSON.stringify(history));
    if (localStorage.getItem(RECENT_REF_KEY) === reference.toUpperCase()) {
      localStorage.removeItem(RECENT_REF_KEY);
      localStorage.removeItem(RECENT_EMAIL_KEY);
    }
  } catch {
    // Silencioso
  }
}

export function clearOrderHistory(): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(RECENT_REF_KEY);
    localStorage.removeItem(RECENT_EMAIL_KEY);
  } catch {
    // Silencioso
  }
}

// ==========================================
// 2. PERFIL DE CLIENTE Y DIRECCIONES
// ==========================================

export function getCustomerProfile(): CustomerProfile | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as CustomerProfile;
      if (p && p.name && p.email) return p;
    }

    // Migración desde el legacy 'lacajita.customer'
    const legacyRaw = localStorage.getItem(LEGACY_SAVED_KEY);
    if (legacyRaw) {
      const l = JSON.parse(legacyRaw);
      if (l.name && l.email) {
        const addresses: SavedAddress[] = [];
        if (l.address && l.city && l.department) {
          addresses.push({
            id: 'addr-default',
            label: 'Dirección habitual',
            address: l.address,
            address2: l.address2 || '',
            city: l.city,
            department: l.department,
            isDefault: true,
          });
        }
        const profile: CustomerProfile = {
          name: l.name,
          email: l.email,
          phone: l.phone || '',
          doc: l.doc || '',
          addresses,
          defaultAddressId: addresses[0]?.id,
          updatedAt: new Date().toISOString(),
        };
        saveCustomerProfile(profile);
        return profile;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(profile: CustomerProfile): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    // Para compatibilidad con legacy readers (lacajita.customer):
    const defaultAddr = profile.addresses.find((a) => a.id === profile.defaultAddressId) || profile.addresses[0];
    const legacy = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      doc: profile.doc || '',
      address: defaultAddr?.address || '',
      address2: defaultAddr?.address2 || '',
      city: defaultAddr?.city || '',
      department: defaultAddr?.department || '',
    };
    localStorage.setItem(LEGACY_SAVED_KEY, JSON.stringify(legacy));
  } catch {
    // Silencioso
  }
}

export function saveCustomerAddress(address: Omit<SavedAddress, 'id'> & { id?: string }, customerData?: { name?: string; email?: string; phone?: string; doc?: string }): void {
  if (!isStorageAvailable()) return;
  try {
    let profile = getCustomerProfile();
    if (!profile) {
      profile = {
        name: customerData?.name || '',
        email: customerData?.email || '',
        phone: customerData?.phone || '',
        doc: customerData?.doc || '',
        addresses: [],
        updatedAt: new Date().toISOString(),
      };
    } else {
      if (customerData?.name) profile.name = customerData.name;
      if (customerData?.email) profile.email = customerData.email;
      if (customerData?.phone) profile.phone = customerData.phone;
      if (customerData?.doc !== undefined) profile.doc = customerData.doc;
    }

    const addrId = address.id || `addr-${Date.now()}`;
    const cleanAddr: SavedAddress = {
      id: addrId,
      label: address.label || (profile.addresses.length === 0 ? 'Dirección habitual' : `Dirección ${profile.addresses.length + 1}`),
      address: address.address.trim(),
      address2: address.address2?.trim() || '',
      city: address.city.trim(),
      department: address.department.trim(),
      notes: address.notes?.trim() || '',
      isDefault: address.isDefault ?? (profile.addresses.length === 0),
    };

    const existingIdx = profile.addresses.findIndex((a) => a.id === addrId || (a.address === cleanAddr.address && a.city === cleanAddr.city));
    if (existingIdx >= 0) {
      profile.addresses[existingIdx] = cleanAddr;
    } else {
      // Si la nueva es default, quitar default a las demás
      if (cleanAddr.isDefault) {
        profile.addresses.forEach((a) => (a.isDefault = false));
      }
      profile.addresses.push(cleanAddr);
    }

    if (cleanAddr.isDefault || !profile.defaultAddressId) {
      profile.defaultAddressId = addrId;
    }

    profile.updatedAt = new Date().toISOString();
    saveCustomerProfile(profile);
  } catch {
    // Silencioso
  }
}

export function clearCustomerData(): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEGACY_SAVED_KEY);
  } catch {
    // Silencioso
  }
}
