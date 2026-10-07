import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import type { ProductUpsert } from '@lacajita/shared';
import { DB, type Db } from '../db/db.module';
import { messages, orderItems, orders, products, settings, subscribers } from '../db/schema';
import { OrdersService } from '../orders/orders.service';
import { JOBS, JobsService } from '../jobs/jobs.service';

const PAID = ['paid', 'preparing', 'shipped', 'delivered'];

@Injectable()
export class AdminService {
  constructor(@Inject(DB) private readonly db: Db, private readonly ordersSvc: OrdersService, private readonly jobs: JobsService) {}

  async summary() {
    const since = new Date(Date.now() - 30 * 86400000);
    const [sales] = await this.db.select({ total: sql<number>`coalesce(sum(${orders.total}),0)::int`, count: sql<number>`count(*)::int` })
      .from(orders).where(and(inArray(orders.status, PAID), gte(orders.createdAt, since)));
    const [toShip] = await this.db.select({ c: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, ['paid', 'preparing']));
    const [pending] = await this.db.select({ c: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, 'pending'), inArray(orders.paymentMethod, ['transfer', 'cod'])));
    const lowStock = await this.db.select({ id: products.id, name: products.name, stock: products.stock }).from(products).where(and(eq(products.active, true), lte(products.stock, 5)));
    const top = await this.db.select({ name: orderItems.name, units: sql<number>`sum(${orderItems.quantity})::int` }).from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(inArray(orders.status, PAID), gte(orders.createdAt, since)))
      .groupBy(orderItems.name).orderBy(desc(sql`sum(${orderItems.quantity})`));
    const [subs] = await this.db.select({ c: sql<number>`count(*)::int` }).from(subscribers);
    return { sales30d: sales.total, orders30d: sales.count, toShip: toShip.c, pendingConfirmation: pending.c, lowStock, top, subscribers: subs.c };
  }

  products() { return this.db.select().from(products).orderBy(asc(products.sort)); }

  async createProduct(p: ProductUpsert) {
    try { const [row] = await this.db.insert(products).values(p).returning(); return row; }
    catch (e: any) { if (e.code === '23505') throw new ConflictException('Ya existe un producto con ese slug.'); throw e; }
  }

  async updateProduct(id: number, p: Partial<ProductUpsert>) {
    const [row] = await this.db.update(products).set({ ...p, updatedAt: new Date() }).where(eq(products.id, id)).returning();
    if (!row) throw new NotFoundException('Producto no encontrado.');
    return row;
  }

  /** Se desactiva en vez de borrar: conserva el historial de pedidos. */
  async deactivateProduct(id: number) { await this.db.update(products).set({ active: false, updatedAt: new Date() }).where(eq(products.id, id)); }

  orders(q: { status?: string; q?: string; limit?: number }) {
    const conds = [];
    if (q.status) conds.push(eq(orders.status, q.status));
    if (q.q) { const s = `%${q.q.trim()}%`; conds.push(or(ilike(orders.reference, s), ilike(orders.customerName, s), ilike(orders.customerEmail, s))!); }
    return this.db.select().from(orders).where(conds.length ? and(...conds) : undefined).orderBy(desc(orders.createdAt)).limit(Math.min(q.limit || 50, 200));
  }

  async order(id: number) {
    const [o] = await this.db.select().from(orders).where(eq(orders.id, id));
    if (!o) throw new NotFoundException('Pedido no encontrado.');
    return { ...o, items: await this.ordersSvc.itemsOf(o.id) };
  }

  async updateOrder(id: number, patch: { status?: string; tracking?: string; carrier?: string; adminNotes?: string }) {
    const [o] = await this.db.select().from(orders).where(eq(orders.id, id));
    if (!o) throw new NotFoundException('Pedido no encontrado.');
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.tracking !== undefined) set.tracking = patch.tracking;
    if (patch.carrier !== undefined) set.carrier = patch.carrier || null;
    if (patch.adminNotes !== undefined) set.adminNotes = patch.adminNotes;
    if (patch.status === 'cancelled' && o.status === 'pending') await this.ordersSvc.release(o.reference, 'cancelled');  // devuelve inventario
    else if (patch.status) set.status = patch.status;
    const [u] = await this.db.update(orders).set(set).where(eq(orders.id, id)).returning();
    if (patch.status === 'shipped' && o.status !== 'shipped') await this.jobs.send(JOBS.mailOrderShipped, { orderId: u.id }, { singletonKey: `shipped-${u.id}` });
    return u;
  }

  subscribers() { return this.db.select().from(subscribers).orderBy(desc(subscribers.createdAt)); }
  async updateSubscriber(id: number, patch: { consent?: boolean; status?: string }) {
    const set: Record<string, any> = {};
    if (patch.consent !== undefined) {
      set.consent = patch.consent;
      if (patch.consent) set.consentAt = new Date();
    }
    if (patch.status) set.status = patch.status;
    const [u] = await this.db.update(subscribers).set(set).where(eq(subscribers.id, id)).returning();
    if (!u) throw new NotFoundException('Suscriptor no encontrado.');
    return u;
  }
  async deleteSubscriber(id: number) {
    await this.db.delete(subscribers).where(eq(subscribers.id, id));
    return { ok: true };
  }

  // Mensajes de contacto
  messages(status?: string) { return this.db.select().from(messages).where(status ? eq(messages.status, status) : undefined).orderBy(desc(messages.createdAt)).limit(200); }
  async setMessageStatus(id: number, status: string) {
    const [m] = await this.db.update(messages).set({ status }).where(eq(messages.id, id)).returning();
    if (!m) throw new NotFoundException('Mensaje no encontrado.');
    return m;
  }
  async createMessage(data: { name: string; email: string; phone?: string | null; message: string; status?: string }) {
    const [m] = await this.db.insert(messages).values({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      message: data.message.trim(),
      status: data.status || 'new',
    }).returning();
    return m;
  }
  async deleteMessage(id: number) {
    const [m] = await this.db.delete(messages).where(eq(messages.id, id)).returning();
    if (!m) throw new NotFoundException('Mensaje no encontrado.');
    return { ok: true };
  }
  async unreadMessages() { const [r] = await this.db.select({ n: sql<number>`count(*)::int` }).from(messages).where(eq(messages.status, 'new')); return r.n; }

  async settings() { return Object.fromEntries((await this.db.select().from(settings)).map((r) => [r.key, r.value])); }

  async saveSettings(body: Record<string, string | undefined>) {
    const rows = Object.entries(body).filter(([, v]) => v !== undefined).map(([key, value]) => ({ key, value: String(value) }));
    if (rows.length) await this.db.insert(settings).values(rows).onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
    return this.settings();
  }
}
