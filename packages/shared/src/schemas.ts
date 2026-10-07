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
  conservation: z.string().nullable().optional(),
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

export const SubscribeSchema = z.object({
  email: z.string().trim().email().max(160),
  consent: z.boolean().optional().default(true),
});

// Administración
export const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const ProductUpsertSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, 'solo minúsculas, números y guiones'),
  name: z.string().trim().min(2).max(120),
  kicker: z.string().trim().max(60).optional().default(''),
  tagline: z.string().trim().max(200).optional().default(''),
  description: z.string().trim().min(5),
  pairing: z.string().trim().max(300).optional().default(''),
  conservation: z.string().trim().max(400).optional().default(''),
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

export const TestimonialSchema = z.object({
  name: z.string().max(80),
  city: z.string().max(80),
  stars: z.number().int().min(1).max(5).default(5),
  product: z.string().max(80),
  quote: z.string().max(400),
  verified: z.boolean().default(true),
});
export type Testimonial = z.infer<typeof TestimonialSchema>;

export const TrustPillarSchema = z.object({
  title: z.string().max(80),
  desc: z.string().max(200),
  icon: z.enum(['leaf', 'truck', 'lock']).default('leaf'),
});
export type TrustPillar = z.infer<typeof TrustPillarSchema>;

export const ProcessStepSchema = z.object({
  num: z.string().max(10),
  title: z.string().max(80),
  subtitle: z.string().max(100),
  desc: z.string().max(300),
  badge: z.string().max(50),
});
export type ProcessStep = z.infer<typeof ProcessStepSchema>;

export const PairingItemSchema = z.object({
  id: z.string().default(''),
  title: z.string().max(140).default(''),
  badge: z.string().max(80).default('Maridaje recomendado'),
  icon: z.string().max(20).default('🧀'),
  dish: z.string().max(400).default(''),
  tip: z.string().max(500).default(''),
  productSlug: z.string().max(100).default(''),
  image: z.string().max(500).optional().default(''),
  active: z.boolean().default(true),
});
export type PairingItem = z.infer<typeof PairingItemSchema>;

export const FooterPillarSchema = z.object({
  id: z.string().default(''),
  icon: z.string().max(20).default('🌶️'),
  title: z.string().max(80).default(''),
  desc: z.string().max(250).default(''),
  active: z.boolean().default(true),
});
export type FooterPillar = z.infer<typeof FooterPillarSchema>;

/** Contenido editable de la tienda. */
export const SiteContentSchema = z.object({
  // 1. Barra de Anuncio Superior
  announcementEnabled: z.boolean().default(true),
  announcementText: z.string().max(200).default('Cosecha artesanal en Bogotá · Envíos a toda Colombia'),
  announcementBadge: z.string().max(60).default('100% NATURAL'),

  // 2. Portada Sensorial (Hero)
  heroBadge: z.string().max(100).default('Bogotá D.C. · Lotes Cortos Hechos a Mano'),
  heroBrand: z.string().max(80).default('Pimentón de verdad. Sin atajos.'),
  tagline: z.string().max(80).default('Productos siempre frescos'),
  heroRatingText: z.string().max(80).default('4.9 (1.200+ mesas)'),
  heroCta: z.string().max(60).default('Ver notas de cata'),
  heroProductSlugs: z.array(z.string().max(80)).default([]),

  // 3. Pilares de Confianza
  trustPillars: z.array(TrustPillarSchema).default([
    {
      title: '100% Sin Conservantes',
      desc: 'Solo ingredientes reales que se entienden y cuidan tu salud.',
      icon: 'leaf',
    },
    {
      title: 'Despacho a Toda Colombia',
      desc: 'Envíos rápidos y seguros con guía de rastreo a tu ciudad.',
      icon: 'truck',
    },
    {
      title: 'Pago Fácil & Protegido',
      desc: 'Tarjeta, PSE, Nequi, Bancolombia o pago contraentrega.',
      icon: 'lock',
    },
  ]),

  // 4. Manifiesto, Historia y Video del Taller (El Alma de Nuestro Fogón)
  manifestoKicker: z.string().max(80).default('El Alma de Nuestro Fogón'),
  aboutTitle: z.string().max(120).default('Pimentón de verdad. Sin atajos ni conservantes.'),
  aboutText: z.string().max(1000).default('Nuestras cosechas de pimentón se escogen con calidad y amor. En Bogotá cocinamos cada tanda a mano, con ingredientes que se entienden y sin conservantes.'),
  videoUrl: z.string().max(200).default('https://www.youtube.com/embed/nKZEfpe_bng'),
  mission: z.string().max(500).default('En La Cajita cocinamos el pimentón como se hace en casa: a fuego lento, en tandas cortas y sin nada que no entiendas.'),
  values: z.array(z.string().max(40)).max(16).default(['Sin conservantes', 'Tandas cortas', 'Hecho a mano', 'Huevos campesinos', 'Fuego lento', 'Hecho en Colombia']),

  // 5. Catálogo de Frascos
  catalogKicker: z.string().max(60).default('Frascos Individuales'),
  catalogTitle: z.string().max(100).default('Nuestra Colección de Frascos'),
  catalogSubtitle: z.string().max(300).default('Tandas cortas en frascos de vidrio de 200 g. Sin químicos ni espesantes.'),

  // 6. Caja de Madera Artesanal (Box Builder y Combos)
  giftKicker: z.string().max(60).default('Edición Especial'),
  giftTitle: z.string().max(80).default('Caja de Madera Artesanal'),
  giftText: z.string().max(400).default('El regalo definitivo para amantes de la buena cocina. Escoge tus 4 frascos favoritos.'),
  giftCapacity: z.number().int().min(2).max(12).default(4),
  giftDiscountPct: z.number().min(0).max(100).default(0),
  giftPricingMode: z.enum(['sum', 'fixed']).default('sum'),
  giftFixedPrice: z.number().min(0).default(0),
  giftProductSlugs: z.array(z.string()).default([]),

  // 7. Guía de Maridajes Culinarios
  pairingKicker: z.string().max(60).default('Inspiración en la Cocina'),
  pairingTitle: z.string().max(100).default('¿Cómo disfrutar cada sabor en tu mesa?'),
  pairingSubtitle: z.string().max(400).default('Nuestras conservas no son solo aderezos: son el toque secreto para transformar platos cotidianos en momentos gourmet memorables.'),
  pairingItems: z.array(PairingItemSchema).default([
    {
      id: 'maridaje-mayonesa',
      title: 'La consentida · Mayonesa de Pimentón',
      badge: 'La consentida',
      icon: '🍔',
      dish: 'Papa criolla, sándwiches, hamburguesas, mazorca asada',
      tip: 'Cremosa con todo el sabor del pimentón tostado al fuego, perfecta para untar sin moderación.',
      productSlug: 'mayonesa-pimenton',
      image: '',
      active: true,
    },
    {
      id: 'maridaje-confitados',
      title: 'Para la tabla · Pimentones Confitados',
      badge: 'Para la tabla',
      icon: '🧀',
      dish: 'Queso madurado, jamón serrano, pan de masa madre tostado',
      tip: 'Confitados despacio en aceite de oliva y especias. La joya indiscutible de cualquier picada.',
      productSlug: 'pimentones-confitados',
      image: '',
      active: true,
    },
    {
      id: 'maridaje-salsa-rustica',
      title: 'Humo y nuez · Salsa Rústica de Pimentón',
      badge: 'Humo y nuez',
      icon: '🥩',
      dish: 'Cortes a la brasa, carnes asadas, pollo al horno, papas rústicas',
      tip: 'Textura rústica y profundidad ahumada que abraza carnes rojas y parrilladas con carácter.',
      productSlug: 'salsa-rustica',
      image: '',
      active: true,
    },
    {
      id: 'maridaje-mermelada',
      title: 'La agridulce · Mermelada de Pimentón',
      badge: 'La agridulce',
      icon: '🫓',
      dish: 'Queso brie tibio, queso crema, galletas de soda, tostadas francesas',
      tip: 'El contraste agridulce perfecto que eleva desde un desayuno con quesos hasta un postre atrevido.',
      productSlug: 'mermelada-pimenton',
      image: '',
      active: true,
    },
    {
      id: 'maridaje-dip-ahumado',
      title: 'Edición Especial · Dip de Pimentón Ahumado',
      badge: 'Edición Especial',
      icon: '🧀',
      dish: 'Nachos de maíz, chips de plátano, bastones de zanahoria y apio',
      tip: 'Suave, sedoso y ahumado en leña. Ideal para servir al centro de la mesa en reuniones.',
      productSlug: 'dip-ahumado',
      image: '',
      active: true,
    },
  ]),

  // 8. Proceso Artesanal: "De la Huerta a tu Mesa"
  processKicker: z.string().max(60).default('El Oficio Detrás del Frasco'),
  processTitle: z.string().max(100).default('De la huerta a tu mesa: Sin atajos ni conservantes'),
  processSubtitle: z.string().max(400).default('En un mundo lleno de salsas industriales con químicos impronunciables, cocinamos como en casa: con fuego lento, mortero y amor por los ingredientes reales.'),
  processSteps: z.array(ProcessStepSchema).default([
    {
      num: '01',
      title: 'Huerta y Cosecha a Mano',
      subtitle: 'Selección en su punto justo',
      desc: 'Pimentones madurados bajo el sol de la Sabana. Solo escogemos frutos carnosos, dulces y de color encendido.',
      badge: 'Materia prima real',
    },
    {
      num: '02',
      title: 'Asado al Fuego de Leña',
      subtitle: 'Caramelización natural',
      desc: 'El calor directo despierta los azúcares naturales del pimentón y sella ese perfume a brasa y domingo que enamora.',
      badge: 'Fuego vivo',
    },
    {
      num: '03',
      title: 'Mortero y Tandas Cortas',
      subtitle: 'Paciencia antes que prisa',
      desc: 'Molienda pausada para cuidar la textura: tiras tiernas, nuez crujiente y emulsiones con densidad de nube.',
      badge: 'Lotes pequeños',
    },
    {
      num: '04',
      title: 'Envasado en Frasco de Vidrio',
      subtitle: 'Sin químicos ni atajos',
      desc: 'Esterilizado al vacío. Cero conservantes artificiales, cero almidones, cero colorantes. Pimentón de verdad.',
      badge: 'Puro y limpio',
    },
  ]),

  // 9. Filosofía Slow Food (Cocina sin Afán)
  slowKicker: z.string().max(60).default('Cocina sin Afán'),
  slowTitle: z.string().max(80).default('Lo bueno se cocina despacio.'),
  slowText: z.string().max(500).default('Asamos, confitamos y molemos en mortero, en tandas que caben en una olla. Por eso cada frasco sabe a cocina de casa y no a fábrica.'),

  // 10. Conservación (Ficha de Producto)
  conservation: z.string().max(400).default('Cerrado, en un lugar fresco y sin sol. Una vez abierto, en la nevera: no lleva conservantes.'),

  // 11. Testimonios
  testimonials: z.array(TestimonialSchema).default([
    {
      name: 'Camila Restrepo',
      city: 'Bogotá D.C.',
      stars: 5,
      product: 'Mayonesa de Pimentón',
      quote: 'Superó todas mis expectativas. No sabe al típico aderezo industrial de supermercado: tiene la textura de una nube y un ahumado a leña espectacular.',
      verified: true,
    },
    {
      name: 'Santiago Morales',
      city: 'Medellín',
      stars: 5,
      product: 'Caja Artesanal de 4 Sabores',
      quote: 'Llevé la caja de madera de regalo para una comida familiar y fue la sensación de la mesa. Los confitados sobre queso brie volaron en 10 minutos.',
      verified: true,
    },
    {
      name: 'Andrea Peñaranda',
      city: 'Chía, Cundinamarca',
      stars: 5,
      product: 'Salsa Rústica de Pimentón',
      quote: 'Qué orgullo que tengamos en Colombia productos con esta calidad. Los trocitos de nuez tostada y la textura de mortero hacen una diferencia gigante en los asados.',
      verified: true,
    },
  ]),

  // 12. Preguntas Frecuentes (FAQ)
  faqKicker: z.string().max(60).default('Dudas Resueltas'),
  faqTitle: z.string().max(80).default('Preguntas frecuentes'),
  faqSubtitle: z.string().max(300).default('Todo sobre nuestros envíos, tiempos de entrega y conservación en casa.'),
  faq: z.array(z.object({ q: z.string().max(160), a: z.string().max(600) })).max(25).default([]),

  // 13. Newsletter / Boletín del Fogón
  newsletterKicker: z.string().max(60).default('✦ Club Privado del Fogón'),
  newsletterTitle: z.string().max(100).default('Únete a La Cajita'),
  newsletterSubtitle: z.string().max(300).default('Tandas recién salidas del fogón, recetas de autor y beneficios exclusivos antes que nadie.'),
  newsletterNote: z.string().max(160).default('Sin spam · Solo cocina honesta y avisos de tandas frescas'),
  newsletterConsentText: z.string().max(250).default('Autorizo el tratamiento de mis datos personales según la Política de Privacidad (Ley 1581 de 2012).'),

  // 14. Atención por WhatsApp Flotante
  floatingChatEnabled: z.boolean().default(true),
  floatingChatTitle: z.string().max(100).default('¿Dudas con tus sabores o envíos?'),
  floatingChatText: z.string().max(200).default('Chatea directo con nuestro taller en Bogotá.'),

  // 15. Garantías del Pie de Página (Ribbon)
  footerRibbonEnabled: z.boolean().default(true),
  footerPillars: z.array(FooterPillarSchema).default([
    { id: 'fp-1', icon: '🌶️', title: 'Cosecha Seleccionada', desc: 'Pimentones maduros asados y confitados a fuego lento en Bogotá.', active: true },
    { id: 'fp-2', icon: '🌿', title: '100% Libre de Químicos', desc: 'Sin conservantes artificiales, espesantes ni colorantes añadidos.', active: true },
    { id: 'fp-3', icon: '📦', title: 'Envíos a Toda Colombia', desc: 'Embalaje antigolpes con sello térmico. Gratis desde $90.000.', active: true },
    { id: 'fp-4', icon: '🔒', title: 'Compra Segura & PSE', desc: 'Transacciones cifradas con Wompi, Bancolombia, Nequi y tarjetas.', active: true },
  ]),

  // 16. Pie de Página (Footer & Taller)
  footerManifesto: z.string().max(500).default('Conservas de pimentón de autor elaboradas a mano en tandas cortas. Honramos el tiempo de la cocina tradicional para transformar momentos sencillos en banquetes memorables.'),
  footerOriginBadge: z.string().max(120).default('Hecho con orgullo y fogón en Bogotá, Colombia'),
  footerWorkshopStatus: z.string().max(100).default('Taller activo · Despachando hoy'),
  footerWorkshopActive: z.boolean().default(true),

  // 17. Carrito de Compras (Gaveta Lateral)
  cartTitle: z.string().max(60).default('Carrito'),
  cartFreeShippingBarEnabled: z.boolean().default(true),
  cartFreeShippingText: z.string().max(120).default('¡Felicitaciones! Tienes Envío Gratis'),
  cartUpsellEnabled: z.boolean().default(true),
  cartUpsellTitle: z.string().max(80).default('Completa tu mesa'),
  cartUpsellProductSlug: z.string().max(80).default('auto'),
  cartGiftEnabled: z.boolean().default(true),
  cartGiftTitle: z.string().max(100).default('¿Es un regalo? Dedicatoria artesanal'),
  cartGiftBadge: z.string().max(40).default('Sin costo'),
  cartGiftNote: z.string().max(200).default('Incluimos una tarjeta con dedicatoria en papel rústico dentro de tu pedido.'),
  cartShippingNote: z.string().max(160).default('Envío calculado en el siguiente paso según tu ciudad.'),
  cartCheckoutBtnText: z.string().max(80).default('Continuar al Pago'),
  cartWhatsAppEnabled: z.boolean().default(true),
  cartWhatsAppBtnText: z.string().max(80).default('Prefiero pedir por WhatsApp'),
  cartGuaranteeText: z.string().max(160).default('🌿 100% Sin Conservantes · 🚚 Despachos a toda Colombia'),
}).passthrough();
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
