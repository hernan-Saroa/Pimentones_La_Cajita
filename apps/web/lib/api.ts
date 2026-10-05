import { ProductSchema, StoreInfoSchema, OrderCreatedSchema, PublicOrderSchema, SuggestionSchema, QuoteSchema, SiteContentSchema,
  type Product, type StoreInfo, type ContactInput, type CreateOrderWithCoupon, type PublicOrder, type Suggestion, type Quote, type QuoteRequest, type SiteContent } from '@lacajita/shared';
import { z } from 'zod';

/**
 * Cliente de la API, tipado y validado con los esquemas compartidos.
 * En el servidor habla directo con la API (API_URL); en el navegador usa el mismo origen (rewrites).
 */
const isServer = typeof window === 'undefined';
const BASE = isServer ? process.env.API_URL || 'http://localhost:4000' : '';

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

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
  products: () => request('/products', z.array(ProductSchema)),
  product: (slug: string) => request(`/products/${slug}`, ProductSchema),
  store: () => request('/store', StoreInfoSchema),
  content: () => request('/content', SiteContentSchema),
  quote: (body: QuoteRequest) => request('/orders/quote', QuoteSchema, { method: 'POST', body: JSON.stringify(body) }),
  createOrder: (body: CreateOrderWithCoupon) => request('/orders', OrderCreatedSchema, { method: 'POST', body: JSON.stringify(body) }),
  order: (ref: string, q: { email: string; tx?: string }) => request(`/orders/${encodeURIComponent(ref)}?${new URLSearchParams(q as Record<string, string>)}`, PublicOrderSchema),
  suggest: (text: string) => request('/suggest', SuggestionSchema, { method: 'POST', body: JSON.stringify({ text }) }),
  contact: (body: ContactInput) => request('/contact', z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify(body) }),
  subscribe: (email: string) => request('/subscribe', z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify({ email }) }),
};

/** Cliente de administración (solo navegador). */
export const adminApi = (token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  const any = z.any();
  return {
    login: (email: string, password: string) => request('/admin/login', z.object({ token: z.string(), user: z.object({ id: z.number(), email: z.string(), name: z.string(), role: z.string() }) }), { method: 'POST', body: JSON.stringify({ email, password }) }),
    summary: () => request('/admin/summary', any, { headers: auth }),
    orders: (q: Record<string, string> = {}) => request(`/admin/orders?${new URLSearchParams(q)}`, z.array(any), { headers: auth }),
    order: (id: number) => request(`/admin/orders/${id}`, any, { headers: auth }),
    updateOrder: (id: number, body: object) => request(`/admin/orders/${id}`, any, { method: 'PATCH', body: JSON.stringify(body), headers: auth }),
    products: () => request('/admin/products', z.array(any), { headers: auth }),
    saveProduct: (p: { id?: number } & Record<string, unknown>) => {
      const { id, createdAt: _c, updatedAt: _u, ...rest } = p as Record<string, unknown>;
      return id ? request(`/admin/products/${id}`, any, { method: 'PUT', body: JSON.stringify(rest), headers: auth })
                : request('/admin/products', any, { method: 'POST', body: JSON.stringify(rest), headers: auth });
    },
    upload: async (file: File) => {
      const f = new FormData(); f.append('image', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: f, headers: auth });
      const d = await res.json(); if (!res.ok) throw new ApiError(d.error, res.status); return d as { url: string };
    },
    settings: () => request('/admin/settings', z.record(z.string()), { headers: auth }),
    saveSettings: (s: Record<string, string>) => request('/admin/settings', z.record(z.string()), { method: 'PUT', body: JSON.stringify(s), headers: auth }),
    subscribers: () => request('/admin/subscribers', z.array(any), { headers: auth }),
    messages: (status?: string) => request(`/admin/messages${status ? `?status=${status}` : ''}`, z.array(any), { headers: auth }),
    setMessageStatus: (id: number, status: string) => request(`/admin/messages/${id}`, any, { method: 'PATCH', body: JSON.stringify({ status }), headers: auth }),
    me: () => request('/admin/me', any, { headers: auth }),
    analytics: (days: number) => request(`/admin/analytics?days=${days}`, any, { headers: auth }),
    funnel: (days: number) => request(`/admin/analytics/funnel?days=${days}`, any, { headers: auth }),
    customers: (q = '') => request(`/admin/customers?q=${encodeURIComponent(q)}`, z.array(any), { headers: auth }),
    customerOrders: (email: string) => request(`/admin/customers/${encodeURIComponent(email)}/orders`, z.array(any), { headers: auth }),
    coupons: () => request('/admin/coupons', z.array(any), { headers: auth }),
    saveCoupon: (c: object, id?: number) => request(id ? `/admin/coupons/${id}` : '/admin/coupons', any, { method: id ? 'PUT' : 'POST', body: JSON.stringify(c), headers: auth }),
    zones: () => request('/admin/zones', z.array(any), { headers: auth }),
    saveZone: (zn: object, id?: number) => request(id ? `/admin/zones/${id}` : '/admin/zones', any, { method: id ? 'PUT' : 'POST', body: JSON.stringify(zn), headers: auth }),
    inventory: () => request('/admin/inventory', any, { headers: auth }),
    movements: (productId: number) => request(`/admin/inventory/${productId}/movements`, z.array(any), { headers: auth }),
    batches: (productId: number) => request(`/admin/inventory/${productId}/batches`, z.array(any), { headers: auth }),
    addBatch: (b: object) => request('/admin/inventory/batches', any, { method: 'POST', body: JSON.stringify(b), headers: auth }),
    adjustStock: (b: object) => request('/admin/inventory/adjust', any, { method: 'POST', body: JSON.stringify(b), headers: auth }),
    content: () => request('/admin/content', any, { headers: auth }),
    saveContent: (c: object) => request('/admin/content', any, { method: 'PUT', body: JSON.stringify(c), headers: auth }),
    users: () => request('/admin/users', z.array(any), { headers: auth }),
    createUser: (u: object) => request('/admin/users', any, { method: 'POST', body: JSON.stringify(u), headers: auth }),
    updateUser: (id: number, u: object) => request(`/admin/users/${id}`, any, { method: 'PATCH', body: JSON.stringify(u), headers: auth }),
    audit: () => request('/admin/audit?limit=200', z.array(any), { headers: auth }),
    /** Descarga un CSV protegido (el token va en el encabezado, así que no sirve un enlace directo). */
    download: async (path: string, filename: string) => {
      const res = await fetch(`/api/admin/${path}`, { headers: auth }); if (!res.ok) throw new ApiError('No se pudo exportar.', res.status);
      const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    },
  };
};

export type { Product, StoreInfo, PublicOrder, Suggestion, Quote, SiteContent };

/** Valores por defecto cuando la API no responde (construcción de la imagen o caída temporal). */
export const DEFAULT_STORE: StoreInfo = { shipping: { flat: 0, local: 0, localCity: '', freeFrom: 0 }, whatsapp: '', contact: { email: '', phone: '', city: '', instagram: '' }, transferInstructions: '', paymentMethods: ['transfer', 'cod'] };
