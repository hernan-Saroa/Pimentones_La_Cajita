import { pgTable, serial, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

/** Esquema de datos. Las migraciones se generan desde aquí con drizzle-kit. */

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  kicker: varchar('kicker', { length: 60 }),
  tagline: varchar('tagline', { length: 200 }),
  description: text('description').notNull(),
  pairing: varchar('pairing', { length: 300 }),
  conservation: text('conservation'),
  price: integer('price').notNull(),           // COP sin decimales
  sizeG: integer('size_g').notNull().default(200),
  stock: integer('stock').notNull().default(0),
  image: varchar('image', { length: 300 }),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  reference: varchar('reference', { length: 40 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  customerName: varchar('customer_name', { length: 120 }).notNull(),
  customerEmail: varchar('customer_email', { length: 160 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 30 }).notNull(),
  customerDoc: varchar('customer_doc', { length: 30 }),
  address: varchar('address', { length: 250 }).notNull(),
  city: varchar('city', { length: 80 }).notNull(),
  department: varchar('department', { length: 80 }).notNull(),
  notes: varchar('notes', { length: 500 }),
  subtotal: integer('subtotal').notNull(),
  shipping: integer('shipping').notNull(),
  total: integer('total').notNull(),
  wompiTransactionId: varchar('wompi_transaction_id', { length: 80 }),
  tracking: varchar('tracking', { length: 120 }),
  carrier: varchar('carrier', { length: 60 }),
  sessionId: varchar('session_id', { length: 64 }),
  discount: integer('discount').notNull().default(0),
  couponCode: varchar('coupon_code', { length: 40 }),
  adminNotes: text('admin_notes'),
  etaDays: varchar('eta_days', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('orders_status_idx').on(t.status), index('orders_email_idx').on(t.customerEmail)]);

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 120 }).notNull(),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
});

export const settings = pgTable('settings', {
  key: varchar('key', { length: 60 }).primaryKey(),
  value: text('value').notNull(),
});

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  consent: boolean('consent').notNull().default(true),
  consentAt: timestamp('consent_at', { withTimezone: true }).defaultNow(),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProductRow = typeof products.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;

// ---------- Backoffice ----------

/** Cupones: porcentaje, monto fijo o envío gratis. El servidor valida y aplica; el cliente solo escribe el código. */
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(),           // percent | fixed | free_shipping
  value: integer('value').notNull().default(0),                 // % o COP
  minSubtotal: integer('min_subtotal').notNull().default(0),
  maxUses: integer('max_uses'),                                 // null = sin límite
  usedCount: integer('used_count').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Zonas de envío por departamento: tarifa, días de entrega y si hay contraentrega. */
export const shippingZones = pgTable('shipping_zones', {
  id: serial('id').primaryKey(),
  department: varchar('department', { length: 80 }).notNull().unique(),
  rate: integer('rate').notNull(),
  daysMin: integer('days_min').notNull().default(2),
  daysMax: integer('days_max').notNull().default(5),
  codAvailable: boolean('cod_available').notNull().default(false),
  active: boolean('active').notNull().default(true),
});

/** Lotes de producción: trazabilidad y vencimiento. Crear un lote suma inventario. */
export const batches = pgTable('batches', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 40 }).notNull(),
  quantity: integer('quantity').notNull(),
  producedAt: timestamp('produced_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  note: varchar('note', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Movimientos de inventario: cada cambio de stock queda explicado (venta, devolución, lote, ajuste). */
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  reason: varchar('reason', { length: 20 }).notNull(),         // sale | release | batch | adjust
  orderId: integer('order_id'),
  batchId: integer('batch_id'),
  note: varchar('note', { length: 300 }),
  actor: varchar('actor', { length: 160 }),                    // correo del admin o "sistema"
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('stock_movements_product_idx').on(t.productId)]);

/** Usuarios del backoffice con rol. owner > admin > ops > viewer. */
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  passwordHash: varchar('password_hash', { length: 200 }).notNull(),
  role: varchar('role', { length: 60 }).notNull().default('ops'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Bitácora: quién hizo qué y cuándo. */
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actor: varchar('actor', { length: 160 }).notNull(),
  action: varchar('action', { length: 60 }).notNull(),
  entity: varchar('entity', { length: 40 }).notNull(),
  entityId: varchar('entity_id', { length: 60 }),
  detail: text('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_created_idx').on(t.createdAt)]);

/** Contenido editable de la tienda (JSON por clave): preguntas frecuentes, textos de portada. */
export const content = pgTable('content', {
  key: varchar('key', { length: 60 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Eventos del embudo de compra, enviados por la tienda en segundo plano. */
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  path: varchar('path', { length: 200 }),
  productId: integer('product_id'),
  value: integer('value'),
  meta: text('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (t) => [index('events_created_idx').on(t.createdAt), index('events_session_idx').on(t.sessionId)]);

/** Mensajes del formulario de contacto (el de la página actual), con estado para el backoffice. */
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('new'),   // new | read | answered
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('messages_status_idx').on(t.status), index('messages_email_idx').on(t.email)]);

/** Historial de cada conversación de la bandeja: respuestas enviadas, notas internas del equipo y cambios de estado. */
export const messageEvents = pgTable('message_events', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 20 }).notNull(),          // reply | note | status
  channel: varchar('channel', { length: 20 }),               // email | whatsapp (solo respuestas)
  body: text('body'),
  author: varchar('author', { length: 160 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('message_events_message_idx').on(t.messageId)]);
