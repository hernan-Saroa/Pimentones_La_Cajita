import { ProductSchema, StoreInfoSchema, OrderCreatedSchema, PublicOrderSchema, SuggestionSchema, QuoteSchema, SiteContentSchema, CustomerOrderHistoryItemSchema,
  type Product, type StoreInfo, type ContactInput, type CreateOrderWithCoupon, type PublicOrder, type Suggestion, type Quote, type QuoteRequest, type SiteContent, type CustomerOrderHistoryItem } from '@lacajita/shared';
import { z } from 'zod';

/**
 * Cliente de la API, tipado y validado con los esquemas compartidos.
 * En el servidor habla directo con la API (API_URL); en el navegador usa el mismo origen (rewrites).
 */
const isServer = typeof window === 'undefined';
const BASE = isServer ? process.env.API_URL || 'http://localhost:4000' : '';

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

// -----------------------------------------------------------------------------
// Caché en memoria de alto rendimiento y deduplicación en cliente
// Elimina latencia y re-renders al navegar entre secciones del panel administrativo
// -----------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inflightRequests = new Map<string, Promise<any>>();

/** Lectura para pintar al instante (stale-while-revalidate): el módulo muestra esto y luego refresca en segundo plano. */
export function getCachedData<T = any>(key: string, maxAgeMs = 600_000): T | null {
  if (isServer) return null;
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) return null;
  return entry.data as T;
}

export function setCachedData<T = any>(key: string, data: T): void {
  if (isServer) return;
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(pattern?: string | RegExp): void {
  if (isServer) return;
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of Array.from(memoryCache.keys())) {
    const match = typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);
    if (match) {
      memoryCache.delete(key);
    }
  }
}

async function cachedRequest<T>(
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  force = false
): Promise<T> {
  if (!isServer && !force) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data as T;
    }
  }

  if (!isServer && !force && inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)!;
  }

  const promise = fetcher()
    .then((data) => {
      if (!isServer) {
        memoryCache.set(cacheKey, { data, timestamp: Date.now() });
        inflightRequests.delete(cacheKey);
      }
      return data;
    })
    .catch((err) => {
      if (!isServer) {
        inflightRequests.delete(cacheKey);
      }
      throw err;
    });

  if (!isServer) {
    inflightRequests.set(cacheKey, promise);
  }
  return promise;
}

async function request<S extends z.ZodTypeAny>(path: string, schema: S, init: RequestInit & { revalidate?: number } = {}): Promise<z.output<S>> {
  const { revalidate, ...rest } = init;
  const res = await fetch(`${BASE}/api${path}`, {
    ...rest,
    headers: { 'content-type': 'application/json', ...(rest.headers || {}) },
    ...(isServer ? { next: { revalidate: revalidate ?? 60 } } : { cache: 'no-store' }),
  } as RequestInit);
  if (res.status === 204) return undefined as z.output<S>;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || 'No se pudo completar la solicitud.', res.status);
  return schema.parse(data);
}

export const api = {
  products: (force = false) => cachedRequest('pub:products', 60_000, () => request('/products', z.array(ProductSchema)), force),
  product: (slug: string, force = false) => cachedRequest(`pub:product:${slug}`, 60_000, () => request(`/products/${slug}`, ProductSchema), force),
  store: (force = false) => cachedRequest('pub:store', 120_000, () => request('/store', StoreInfoSchema), force),
  content: (force = false) => cachedRequest('pub:content', 120_000, () => request('/content', SiteContentSchema), force),
  quote: (body: QuoteRequest) => request('/orders/quote', QuoteSchema, { method: 'POST', body: JSON.stringify(body) }),
  createOrder: (body: CreateOrderWithCoupon) => request('/orders', OrderCreatedSchema, { method: 'POST', body: JSON.stringify(body) }),
  order: (ref: string, q: { email: string; tx?: string }) => request(`/orders/${encodeURIComponent(ref)}?${new URLSearchParams(q as Record<string, string>)}`, PublicOrderSchema),
  suggest: (text: string) => request('/suggest', SuggestionSchema, { method: 'POST', body: JSON.stringify({ text }) }),
  contact: (body: ContactInput) => request('/contact', z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify(body) }),
  subscribe: (email: string, consent = true) => request('/subscribe', z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify({ email, consent }) }),
  requestHistoryOtp: (email: string) =>
    request('/orders/request-history-otp', z.object({ ok: z.boolean(), message: z.string(), devCode: z.string().optional() }), {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyHistoryOtp: (email: string, code: string) =>
    request('/orders/verify-history-otp', z.object({ ok: z.boolean(), email: z.string(), orders: z.array(CustomerOrderHistoryItemSchema) }), {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  getCache: getCachedData,
  invalidate: invalidateCache,
};

/** Cliente de administración (solo navegador). */
export const adminApi = (token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  const any = z.any();
  return {
    login: (email: string, password: string) => request('/admin/login', z.object({ token: z.string(), user: z.object({ id: z.number(), email: z.string(), name: z.string(), role: z.string() }) }), { method: 'POST', body: JSON.stringify({ email, password }) }),
    summary: (force = false) => cachedRequest('admin:summary', 30_000, () => request('/admin/summary', any, { headers: auth }), force),
    orders: (q: Record<string, string> = {}, force = false) => {
      const qs = new URLSearchParams(q).toString();
      return cachedRequest(`admin:orders?${qs}`, 30_000, () => request(`/admin/orders?${qs}`, z.array(any), { headers: auth }), force);
    },
    order: (id: number, force = false) => cachedRequest(`admin:order:${id}`, 30_000, () => request(`/admin/orders/${id}`, any, { headers: auth }), force),
    updateOrder: async (id: number, body: object) => {
      invalidateCache(/admin:(orders|summary|analytics|funnel)/);
      return request(`/admin/orders/${id}`, any, { method: 'PATCH', body: JSON.stringify(body), headers: auth });
    },
    products: (force = false) => cachedRequest('admin:products', 60_000, () => request('/admin/products', z.array(any), { headers: auth }), force),
    saveProduct: async (p: { id?: number } & Record<string, unknown>) => {
      invalidateCache(/admin:(products|inventory|summary|analytics|funnel)|pub:(products|product)/);
      const { id, createdAt: _c, updatedAt: _u, ...rest } = p as Record<string, unknown>;
      return id ? request(`/admin/products/${id}`, any, { method: 'PUT', body: JSON.stringify(rest), headers: auth })
                : request('/admin/products', any, { method: 'POST', body: JSON.stringify(rest), headers: auth });
    },
    upload: async (file: File) => {
      const f = new FormData(); f.append('image', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: f, headers: auth });
      const d = await res.json(); if (!res.ok) throw new ApiError(d.error, res.status); return d as { url: string };
    },
    settings: (force = false) => cachedRequest('admin:settings', 60_000, () => request('/admin/settings', z.record(z.string()), { headers: auth }), force),
    saveSettings: async (s: Record<string, string>) => {
      invalidateCache(/admin:settings|pub:store/);
      return request('/admin/settings', z.record(z.string()), { method: 'PUT', body: JSON.stringify(s), headers: auth });
    },
    subscribers: (force = false) => cachedRequest('admin:subscribers', 60_000, () => request('/admin/subscribers', z.array(any), { headers: auth }), force),
    messages: (status?: string, force = false) => cachedRequest(`admin:messages:${status || 'all'}`, 30_000, () => request(`/admin/messages${status ? `?status=${status}` : ''}`, z.array(any), { headers: auth }), force),
    createMessage: async (m: { name: string; email: string; phone?: string | null; message: string; status?: string }) => {
      invalidateCache(/admin:(messages|summary)/);
      return request('/admin/messages', any, { method: 'POST', body: JSON.stringify(m), headers: auth });
    },
    setMessageStatus: async (id: number, status: string) => {
      invalidateCache(/admin:(messages|summary|inbox:events)/);
      return request(`/admin/messages/${id}`, any, { method: 'PATCH', body: JSON.stringify({ status }), headers: auth });
    },
    deleteMessage: async (id: number) => {
      invalidateCache(/admin:(messages|summary)/);
      return request(`/admin/messages/${id}`, any, { method: 'DELETE', headers: auth });
    },
    // Bandeja: historial de conversación, notas, respuestas, acciones masivas y respuestas guardadas.
    inboxMeta: (force = false) => cachedRequest('admin:inbox:meta', 120_000, () => request('/admin/messages/meta', any, { headers: auth }), force),
    saveInboxTemplates: async (t: { id: string; title: string; body: string }[]) => {
      invalidateCache(/admin:inbox:meta/);
      return request('/admin/messages/templates', z.array(any), { method: 'PUT', body: JSON.stringify(t), headers: auth });
    },
    messageEvents: (id: number, force = false) => cachedRequest(`admin:inbox:events:${id}`, 30_000, () => request(`/admin/messages/${id}/events`, z.array(any), { headers: auth }), force),
    addMessageNote: async (id: number, body: string) => {
      invalidateCache(new RegExp(`admin:(messages|inbox:events:${id}$)`));
      return request(`/admin/messages/${id}/notes`, any, { method: 'POST', body: JSON.stringify({ body }), headers: auth });
    },
    replyMessage: async (id: number, b: { channel: 'email' | 'whatsapp'; body: string; resolve?: boolean }) => {
      invalidateCache(new RegExp(`admin:(messages|summary|inbox:events:${id}$)`));
      return request(`/admin/messages/${id}/reply`, any, { method: 'POST', body: JSON.stringify(b), headers: auth });
    },
    bulkMessages: async (ids: number[], action: 'read' | 'new' | 'answered' | 'delete') => {
      invalidateCache(/admin:(messages|summary|inbox:events)/);
      return request('/admin/messages/bulk', any, { method: 'POST', body: JSON.stringify({ ids, action }), headers: auth });
    },
    analytics: (arg: number | { days?: number; from?: string; to?: string } = 30, force = false) => {
      const q = typeof arg === 'number' ? `days=${arg}` : new URLSearchParams(Object.entries(arg).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString();
      return cachedRequest(`admin:analytics?${q}`, 60_000, () => request(`/admin/analytics?${q}`, any, { headers: auth }), force);
    },
    funnel: (arg: number | { days?: number; from?: string; to?: string } = 30, force = false) => {
      const q = typeof arg === 'number' ? `days=${arg}` : new URLSearchParams(Object.entries(arg).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString();
      return cachedRequest(`admin:funnel?${q}`, 60_000, () => request(`/admin/analytics/funnel?${q}`, any, { headers: auth }), force);
    },
    customers: (q = '', force = false) => cachedRequest(`admin:customers:${q}`, 60_000, () => request(`/admin/customers?q=${encodeURIComponent(q)}`, z.array(any), { headers: auth }), force),
    customerOrders: (email: string, force = false) => cachedRequest(`admin:customerOrders:${email}`, 30_000, () => request(`/admin/customers/${encodeURIComponent(email)}/orders`, z.array(any), { headers: auth }), force),
    coupons: (force = false) => cachedRequest('admin:coupons', 60_000, () => request('/admin/coupons', z.array(any), { headers: auth }), force),
    saveCoupon: async (c: object, id?: number) => {
      invalidateCache(/admin:coupons/);
      return request(id ? `/admin/coupons/${id}` : '/admin/coupons', any, { method: id ? 'PUT' : 'POST', body: JSON.stringify(c), headers: auth });
    },
    zones: (force = false) => cachedRequest('admin:zones', 60_000, () => request('/admin/zones', z.array(any), { headers: auth }), force),
    saveZone: async (zn: object, id?: number) => {
      invalidateCache(/admin:zones/);
      return request(id ? `/admin/zones/${id}` : '/admin/zones', any, { method: id ? 'PUT' : 'POST', body: JSON.stringify(zn), headers: auth });
    },
    inventory: (force = false) => cachedRequest('admin:inventory', 60_000, () => request('/admin/inventory', any, { headers: auth }), force),
    movements: (productId: number, force = false) => cachedRequest(`admin:movements:${productId}`, 30_000, () => request(`/admin/inventory/${productId}/movements`, z.array(any), { headers: auth }), force),
    batches: (productId: number, force = false) => cachedRequest(`admin:batches:${productId}`, 30_000, () => request(`/admin/inventory/${productId}/batches`, z.array(any), { headers: auth }), force),
    addBatch: async (b: object) => {
      invalidateCache(/admin:(inventory|products|summary)/);
      return request('/admin/inventory/batches', any, { method: 'POST', body: JSON.stringify(b), headers: auth });
    },
    adjustStock: async (b: object) => {
      invalidateCache(/admin:(inventory|products|summary)/);
      return request('/admin/inventory/adjust', any, { method: 'POST', body: JSON.stringify(b), headers: auth });
    },
    content: (force = false) => cachedRequest('admin:content', 60_000, () => request('/admin/content', any, { headers: auth }), force),
    saveContent: async (c: object) => {
      invalidateCache(/admin:content|pub:content/);
      return request('/admin/content', any, { method: 'PUT', body: JSON.stringify(c), headers: auth });
    },
    users: (force = false) => cachedRequest('admin:users', 60_000, () => request('/admin/users', z.array(any), { headers: auth }), force),
    createUser: async (u: object) => {
      invalidateCache(/admin:(users|audit)/);
      return request('/admin/users', any, { method: 'POST', body: JSON.stringify(u), headers: auth });
    },
    updateUser: async (id: number, u: object) => {
      invalidateCache(/admin:(users|audit)/);
      return request(`/admin/users/${id}`, any, { method: 'PATCH', body: JSON.stringify(u), headers: auth });
    },
    audit: (force = false) => cachedRequest('admin:audit', 30_000, () => request('/admin/audit?limit=200', z.array(any), { headers: auth }), force),
    /** Descarga un CSV protegido (el token va en el encabezado, así que no sirve un enlace directo). */
    download: async (path: string, filename: string) => {
      const res = await fetch(`/api/admin/${path}`, { headers: auth }); if (!res.ok) throw new ApiError('No se pudo exportar.', res.status);
      const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    },
    getCache: <T = any>(key: string, maxAge?: number) => getCachedData<T>(key, maxAge),
    invalidate: (pattern?: string | RegExp) => invalidateCache(pattern),
  };
};

export type { Product, StoreInfo, PublicOrder, Suggestion, Quote, SiteContent };

/** Valores por defecto cuando la API no responde (construcción de la imagen o caída temporal). */
export const DEFAULT_STORE: StoreInfo = { shipping: { flat: 0, local: 0, localCity: '', freeFrom: 0 }, whatsapp: '', contact: { email: '', phone: '', city: '', instagram: '' }, transferInstructions: '', paymentMethods: ['transfer', 'cod'] };
