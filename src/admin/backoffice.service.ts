import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { CouponUpsert } from '@lacajita/shared';
import { ADMIN_ROLES } from '@lacajita/shared';
import { DB, type Db } from '../db/db.module';
import { adminUsers, batches, coupons, orders, products, shippingZones, stockMovements, subscribers } from '../db/schema';
import { hashPassword } from './auth';

const PAID = ['paid', 'preparing', 'shipped', 'delivered'];
type ZoneUpsert = { department: string; rate: number; daysMin: number; daysMax: number; codAvailable: boolean; active: boolean };
type BatchCreate = { productId: number; code: string; quantity: number; producedAt: string; expiresAt: string | null; note: string };
type UserCreate = { email: string; name: string; password: string; role: (typeof ADMIN_ROLES)[number] };
type UserUpdate = { name?: string; role?: (typeof ADMIN_ROLES)[number]; active?: boolean; password?: string };

/** Funciones del backoffice que no son pedidos ni productos: clientes, cupones, zonas, inventario, contenido, usuarios. */
@Injectable()
export class BackofficeService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ---- Clientes (derivados de pedidos) ----
  async customers(q?: string) {
    const rows = await this.db.select({
      email: orders.customerEmail, name: sql<string>`max(${orders.customerName})`, phone: sql<string>`max(${orders.customerPhone})`,
      city: sql<string>`max(${orders.city})`, ordersCount: sql<number>`count(*) filter (where ${orders.status} in ('paid','preparing','shipped','delivered'))::int`,
      spent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('paid','preparing','shipped','delivered')),0)::int`,
      firstOrder: sql<string>`min(${orders.createdAt})`, lastOrder: sql<string>`max(${orders.createdAt})`,
    }).from(orders).groupBy(orders.customerEmail).orderBy(desc(sql`max(${orders.createdAt})`)).limit(500);
    const s = q?.trim().toLowerCase();
    return s ? rows.filter((r) => r.email.includes(s) || r.name.toLowerCase().includes(s) || r.phone.includes(s)) : rows;
  }
  customerOrders(email: string) { return this.db.select().from(orders).where(eq(orders.customerEmail, email.toLowerCase())).orderBy(desc(orders.createdAt)); }

  // ---- Cupones ----
  coupons() { return this.db.select().from(coupons).orderBy(desc(coupons.createdAt)); }
  async saveCoupon(c: CouponUpsert, id?: number) {
    const values = { ...c, startsAt: c.startsAt ? new Date(c.startsAt) : null, endsAt: c.endsAt ? new Date(c.endsAt) : null };
    try {
      if (id) { const [r] = await this.db.update(coupons).set(values).where(eq(coupons.id, id)).returning(); if (!r) throw new NotFoundException('Cupón no encontrado.'); return r; }
      const [r] = await this.db.insert(coupons).values(values).returning(); return r;
    } catch (e: any) { if (e.code === '23505') throw new ConflictException('Ya existe un cupón con ese código.'); throw e; }
  }

  // ---- Zonas de envío ----
  zones() { return this.db.select().from(shippingZones).orderBy(asc(shippingZones.department)); }
  async saveZone(z: ZoneUpsert, id?: number) {
    if (id) { const [r] = await this.db.update(shippingZones).set(z).where(eq(shippingZones.id, id)).returning(); if (!r) throw new NotFoundException('Zona no encontrada.'); return r; }
    const [r] = await this.db.insert(shippingZones).values(z).onConflictDoUpdate({ target: shippingZones.department, set: z }).returning(); return r;
  }

  // ---- Inventario ----
  async inventory() {
    const rows = await this.db.select().from(products).orderBy(asc(products.sort));
    const soon = new Date(Date.now() + 30 * 86400000);
    const expiring = await this.db.select().from(batches).where(and(lte(batches.expiresAt, soon), gte(batches.expiresAt, new Date()))).orderBy(asc(batches.expiresAt));
    // ventas de los últimos 30 días para días de inventario
    const since = new Date(Date.now() - 30 * 86400000);
    const sold = await this.db.select({ productId: stockMovements.productId, units: sql<number>`coalesce(-sum(${stockMovements.delta}),0)::int` }).from(stockMovements)
      .where(and(eq(stockMovements.reason, 'sale'), gte(stockMovements.createdAt, since))).groupBy(stockMovements.productId);
    const soldBy = new Map(sold.map((s) => [s.productId, s.units]));
    return {
      products: rows.map((p) => { const perDay = (soldBy.get(p.id) ?? 0) / 30; return { id: p.id, name: p.name, stock: p.stock, active: p.active, sold30d: soldBy.get(p.id) ?? 0, daysOfStock: perDay > 0 ? Math.round(p.stock / perDay) : null }; }),
      expiringBatches: expiring,
    };
  }
  movements(productId: number) { return this.db.select().from(stockMovements).where(eq(stockMovements.productId, productId)).orderBy(desc(stockMovements.createdAt)).limit(200); }
  productBatches(productId: number) { return this.db.select().from(batches).where(eq(batches.productId, productId)).orderBy(desc(batches.producedAt)); }

  async addBatch(b: BatchCreate, actor: string) {
    return this.db.transaction(async (tx) => {
      const [p] = await tx.select().from(products).where(eq(products.id, b.productId)).for('update');
      if (!p) throw new NotFoundException('Producto no encontrado.');
      const [batch] = await tx.insert(batches).values({ productId: b.productId, code: b.code, quantity: b.quantity, producedAt: new Date(b.producedAt), expiresAt: b.expiresAt ? new Date(b.expiresAt) : null, note: b.note || null }).returning();
      await tx.update(products).set({ stock: sql`${products.stock} + ${b.quantity}`, updatedAt: new Date() }).where(eq(products.id, b.productId));
      await tx.insert(stockMovements).values({ productId: b.productId, delta: b.quantity, reason: 'batch', batchId: batch.id, actor, note: `Lote ${b.code}` });
      return batch;
    });
  }
  async adjustStock(productId: number, delta: number, note: string, actor: string) {
    return this.db.transaction(async (tx) => {
      const [p] = await tx.select().from(products).where(eq(products.id, productId)).for('update');
      if (!p) throw new NotFoundException('Producto no encontrado.');
      if (p.stock + delta < 0) throw new ConflictException(`No puedes dejar el inventario en negativo (hay ${p.stock}).`);
      await tx.update(products).set({ stock: sql`${products.stock} + ${delta}`, updatedAt: new Date() }).where(eq(products.id, productId));
      await tx.insert(stockMovements).values({ productId, delta, reason: 'adjust', note, actor });
      return { stock: p.stock + delta };
    });
  }

  // ---- Usuarios ----
  users() { return this.db.select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role, active: adminUsers.active, lastLoginAt: adminUsers.lastLoginAt, createdAt: adminUsers.createdAt }).from(adminUsers).orderBy(asc(adminUsers.createdAt)); }
  async createUser(u: UserCreate) {
    try { const [r] = await this.db.insert(adminUsers).values({ email: u.email.toLowerCase(), name: u.name, role: u.role, passwordHash: hashPassword(u.password) }).returning({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role, active: adminUsers.active }); return r; }
    catch (e: any) { if (e.code === '23505') throw new ConflictException('Ya existe un usuario con ese correo.'); throw e; }
  }
  async updateUser(id: number, u: UserUpdate, actorId: number) {
    const [target] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
    if (!target) throw new NotFoundException('Usuario no encontrado.');
    if (target.id === actorId && (u.active === false || (u.role && u.role !== 'owner' && target.role === 'owner'))) throw new ConflictException('No puedes quitarte tu propio acceso de propietario.');
    const set: Record<string, unknown> = {};
    if (u.name !== undefined) set.name = u.name; if (u.role !== undefined) set.role = u.role; if (u.active !== undefined) set.active = u.active; if (u.password) set.passwordHash = hashPassword(u.password);
    const [r] = await this.db.update(adminUsers).set(set).where(eq(adminUsers.id, id)).returning({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role, active: adminUsers.active });
    return r;
  }

  // ---- Exportaciones ----
  async ordersCsv(from?: string, to?: string) {
    const conds = []; if (from) conds.push(gte(orders.createdAt, new Date(from))); if (to) conds.push(lte(orders.createdAt, new Date(to)));
    const rows = await this.db.select().from(orders).where(conds.length ? and(...conds) : undefined).orderBy(desc(orders.createdAt)).limit(5000);
    const head = ['referencia', 'fecha', 'estado', 'pago', 'cliente', 'correo', 'celular', 'ciudad', 'departamento', 'direccion', 'subtotal', 'envio', 'descuento', 'cupon', 'total', 'guia'];
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '\uFEFF' + [head.join(';'), ...rows.map((o) => [o.reference, o.createdAt.toISOString(), o.status, o.paymentMethod, o.customerName, o.customerEmail, o.customerPhone, o.city, o.department, o.address, o.subtotal, o.shipping, o.discount, o.couponCode, o.total, o.tracking].map(esc).join(';'))].join('\n');
  }
  async subscribersCsv() {
    const rows = await this.db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
    return '\uFEFFcorreo;fecha\n' + rows.map((r) => `${r.email};${r.createdAt.toISOString()}`).join('\n');
  }
  async customersCsv() {
    const rows = await this.customers();
    return '\uFEFFcorreo;nombre;celular;ciudad;pedidos;gastado;primer_pedido;ultimo_pedido\n' + rows.map((r) => [r.email, r.name, r.phone, r.city, r.ordersCount, r.spent, r.firstOrder, r.lastOrder].join(';')).join('\n');
  }
  async paidStats() { const [r] = await this.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, PAID)); return r; }
}
