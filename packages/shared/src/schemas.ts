import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_METHODS } from './status';

/** Contratos compartidos entre API y web. Un solo lugar: cero desincronización. */

export const ProductSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  kicker: z.string().nullable(),
  tagline: z.string().nullable(),
  description: z.string(),
  pairing: z.string().nullable(),
  price: z.number().int(),
  sizeG: z.number().int(),
  stock: z.number().int(),
  image: z.string().nullable(),
});
export type Product = z.infer<typeof ProductSchema>;

export const StoreInfoSchema = z.object({
  shipping: z.object({ flat: z.number(), local: z.number(), localCity: z.string(), freeFrom: z.number() }),
  whatsapp: z.string(),
  contact: z.object({ email: z.string(), phone: z.string(), city: z.string(), instagram: z.string() }).default({ email: '', phone: '', city: '', instagram: '' }),
  transferInstructions: z.string(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)),
});
export type StoreInfo = z.infer<typeof StoreInfoSchema>;

export const CustomerSchema = z.object({
  name: z.string().trim().min(3, 'Escribe tu nombre y apellido.').max(120),
  email: z.string().trim().email('Revisa el correo.').max(160),
  phone: z.string().trim().regex(/^[+\d\s()-]{7,20}$/, 'Celular no válido.'),
  doc: z.string().trim().max(30).optional().default(''),
  address: z.string().trim().min(5, 'Escribe la dirección completa.').max(250),
  city: z.string().trim().min(2).max(80),
  department: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).optional().default(''),
});

export const CreateOrderSchema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(50) })).min(1).max(20),
  paymentMethod: z.enum(PAYMENT_METHODS),
  customer: CustomerSchema,
  sessionId: z.string().trim().max(64).optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const OrderCreatedSchema = z.object({ reference: z.string(), total: z.number(), paymentUrl: z.string().nullable() });

// Analítica: eventos del embudo que la tienda envía en segundo plano
export const EVENT_TYPES = ['page_view', 'product_view', 'add_to_cart', 'begin_checkout', 'purchase', 'assistant_query'] as const;
export const EventsBatchSchema = z.object({
  sessionId: z.string().trim().min(8).max(64),
  events: z.array(z.object({
    type: z.enum(EVENT_TYPES), at: z.number().int(), path: z.string().max(200).optional(), productId: z.number().int().optional(), value: z.number().int().optional(), meta: z.record(z.string()).optional(),
  })).min(1).max(50),
});
export type OrderCreated = z.infer<typeof OrderCreatedSchema>;

export const PublicOrderSchema = z.object({
  reference: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  subtotal: z.number(), shipping: z.number(), discount: z.number().default(0), total: z.number(),
  tracking: z.string().nullable(), city: z.string(), eta: z.string().nullable().default(null), createdAt: z.string(),
  items: z.array(z.object({ name: z.string(), unitPrice: z.number(), quantity: z.number() })),
});
export type PublicOrder = z.infer<typeof PublicOrderSchema>;

export const SuggestSchema = z.object({ text: z.string().trim().min(2).max(200) });
export const SuggestionSchema = z.object({ slugs: z.array(z.string()), tip: z.string() });
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SubscribeSchema = z.object({ email: z.string().trim().email().max(160) });

// Administración
export const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const ProductUpsertSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, 'solo minúsculas, números y guiones'),
  name: z.string().trim().min(2).max(120),
  kicker: z.string().trim().max(60).optional().default(''),
  tagline: z.string().trim().max(200).optional().default(''),
  description: z.string().trim().min(5),
  pairing: z.string().trim().max(300).optional().default(''),
  price: z.number().int().min(0),
  sizeG: z.number().int().min(0).max(10000).optional().default(200),
  stock: z.number().int().min(0),
  image: z.string().trim().max(300).optional().default(''),
  active: z.boolean().optional().default(true),
  sort: z.number().int().optional().default(0),
});
export type ProductUpsert = z.infer<typeof ProductUpsertSchema>;
export const OrderUpdateSchema = z.object({ status: z.enum(ORDER_STATUSES).optional(), tracking: z.string().trim().max(120).optional(), carrier: z.string().trim().max(60).optional() });
export const SETTING_KEYS = ['shipping_flat', 'shipping_local', 'shipping_local_city', 'shipping_free_from', 'whatsapp', 'transfer_instructions', 'contact_email', 'contact_phone', 'contact_city', 'instagram'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export const SettingsSchema = z.object({
  shipping_flat: z.string().max(1000).optional(), shipping_local: z.string().max(1000).optional(), shipping_local_city: z.string().max(1000).optional(),
  shipping_free_from: z.string().max(1000).optional(), whatsapp: z.string().max(1000).optional(), transfer_instructions: z.string().max(1000).optional(),
  contact_email: z.string().max(160).optional(), contact_phone: z.string().max(40).optional(), contact_city: z.string().max(80).optional(), instagram: z.string().max(80).optional(),
});

// ---------- Cotización, cupones y zonas ----------
export const QuoteRequestSchema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(50) })).min(1).max(20),
  department: z.string().trim().max(80).optional().default(''),
  coupon: z.string().trim().max(40).optional().default(''),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const QuoteSchema = z.object({
  subtotal: z.number(), shipping: z.number(), discount: z.number(), total: z.number(),
  freeShippingFrom: z.number(),
  eta: z.string().nullable(),            // "2 a 5 días hábiles"
  codAvailable: z.boolean(),
  coupon: z.object({ code: z.string(), type: z.enum(['percent', 'fixed', 'free_shipping']), label: z.string() }).nullable(),
  couponError: z.string().nullable(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const CreateOrderWithCouponSchema = CreateOrderSchema.extend({ coupon: z.string().trim().max(40).optional().default('') });
export type CreateOrderWithCoupon = z.infer<typeof CreateOrderWithCouponSchema>;

export const CouponUpsertSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((s) => s.toUpperCase()),
  type: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.number().int().min(0).default(0),
  minSubtotal: z.number().int().min(0).default(0),
  maxUses: z.number().int().positive().nullable().default(null),
  startsAt: z.string().datetime().nullable().default(null),
  endsAt: z.string().datetime().nullable().default(null),
  active: z.boolean().default(true),
});
export type CouponUpsert = z.infer<typeof CouponUpsertSchema>;

export const ZoneUpsertSchema = z.object({
  department: z.string().trim().min(2).max(80),
  rate: z.number().int().min(0),
  daysMin: z.number().int().min(0).max(30).default(2),
  daysMax: z.number().int().min(0).max(30).default(5),
  codAvailable: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const BatchCreateSchema = z.object({
  productId: z.number().int().positive(),
  code: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(1).max(10000),
  producedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().default(null),
  note: z.string().trim().max(300).optional().default(''),
});
export const StockAdjustSchema = z.object({
  productId: z.number().int().positive(),
  delta: z.number().int().refine((n) => n !== 0, 'El ajuste no puede ser 0'),
  note: z.string().trim().min(3, 'Explica el motivo del ajuste').max(300),
});

export const ADMIN_ROLES = ['owner', 'admin', 'ops', 'viewer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export const AdminUserCreateSchema = z.object({
  email: z.string().trim().email().max(160),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(ADMIN_ROLES).default('ops'),
});
export const AdminUserUpdateSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), role: z.enum(ADMIN_ROLES).optional(), active: z.boolean().optional(), password: z.string().min(8).optional() });

export const OrderAdminUpdateSchema = OrderUpdateSchema.extend({ adminNotes: z.string().max(2000).optional() });

/** Contenido editable de la tienda. */
export const SiteContentSchema = z.object({
  heroBrand: z.string().max(80).default('Pimentón de verdad. Sin atajos.'),
  tagline: z.string().max(80).default('Productos siempre frescos'),
  aboutTitle: z.string().max(80).default('Quiénes somos'),
  aboutText: z.string().max(600).default('Nuestras cosechas de pimentón se escogen con calidad y amor. En Bogotá cocinamos cada tanda a mano, con ingredientes que se entienden y sin conservantes.'),
  videoUrl: z.string().max(200).default('https://www.youtube.com/embed/nKZEfpe_bng'),
  mission: z.string().max(400).default('En La Cajita cocinamos el pimentón como se hace en casa: a fuego lento, en tandas cortas y sin nada que no entiendas.'),
  values: z.array(z.string().max(40)).max(12).default(['Sin conservantes', 'Tandas cortas', 'Hecho a mano', 'Huevos campesinos', 'Fuego lento', 'Hecho en Colombia']),
  faq: z.array(z.object({ q: z.string().max(160), a: z.string().max(600) })).max(20).default([]),
  giftTitle: z.string().max(80).default('La caja de 4 sabores'),
  giftText: z.string().max(300).default('Un frasco de cada uno, en caja de madera con lazo. Para quien cocina, arma tablas o lo tiene todo.'),
  slowTitle: z.string().max(80).default('Lo bueno se cocina despacio.'),
  slowText: z.string().max(400).default('Asamos, confitamos y molemos en mortero, en tandas que caben en una olla. Por eso cada frasco sabe a cocina de casa y no a fábrica.'),
  conservation: z.string().max(300).default('Cerrado, en un lugar fresco y sin sol. Una vez abierto, en la nevera: no lleva conservantes.'),
});
export type SiteContent = z.infer<typeof SiteContentSchema>;

// Contacto: el formulario de la página actual, ahora con registro y aviso al negocio
export const ContactSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre.').max(120),
  email: z.string().trim().email('Revisa el correo.').max(160),
  phone: z.string().trim().max(30).optional().default(''),
  message: z.string().trim().min(5, 'Cuéntanos en qué te ayudamos.').max(2000),
  website: z.string().max(200).optional(),   // campo trampa para bots: si trae algo, se ignora en silencio
});
export type ContactInput = z.infer<typeof ContactSchema>;
export const MESSAGE_STATUSES = ['new', 'read', 'answered'] as const;
