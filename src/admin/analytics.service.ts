import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { events, orderItems, orders, products, subscribers } from '../db/schema';

const PAID = ['paid', 'preparing', 'shipped', 'delivered'];

/** Métricas de negocio para el tablero: siempre comparando con el periodo anterior de la misma duración. */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async dashboard(days = 30) {
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    const prevSince = new Date(since.getTime() - days * 86400000);
    const paidIn = (from: Date, to: Date) => and(inArray(orders.status, PAID), gte(orders.createdAt, from), lt(orders.createdAt, to));

    const [cur] = await this.db.select({ sales: sql<number>`coalesce(sum(${orders.total}),0)::int`, count: sql<number>`count(*)::int`, discounts: sql<number>`coalesce(sum(${orders.discount}),0)::int` }).from(orders).where(paidIn(since, now));
    const [prev] = await this.db.select({ sales: sql<number>`coalesce(sum(${orders.total}),0)::int`, count: sql<number>`count(*)::int` }).from(orders).where(paidIn(prevSince, since));
    const [units] = await this.db.select({ n: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int` }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(paidIn(since, now));

    const daily = await this.db.select({ day: sql<string>`to_char(${orders.createdAt} at time zone 'America/Bogota','YYYY-MM-DD')`, sales: sql<number>`sum(${orders.total})::int`, count: sql<number>`count(*)::int` })
      .from(orders).where(paidIn(since, now)).groupBy(sql`1`).orderBy(sql`1`);

    const byStatus = await this.db.select({ status: orders.status, n: sql<number>`count(*)::int` }).from(orders).where(gte(orders.createdAt, since)).groupBy(orders.status);
    const byMethod = await this.db.select({ method: orders.paymentMethod, n: sql<number>`count(*)::int`, sales: sql<number>`coalesce(sum(${orders.total}),0)::int` }).from(orders).where(paidIn(since, now)).groupBy(orders.paymentMethod);
    const byCity = await this.db.select({ city: orders.city, department: orders.department, n: sql<number>`count(*)::int`, sales: sql<number>`sum(${orders.total})::int` })
      .from(orders).where(paidIn(since, now)).groupBy(orders.city, orders.department).orderBy(desc(sql`sum(${orders.total})`)).limit(10);
    const topProducts = await this.db.select({ name: orderItems.name, units: sql<number>`sum(${orderItems.quantity})::int`, sales: sql<number>`sum(${orderItems.quantity}*${orderItems.unitPrice})::int` })
      .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(paidIn(since, now)).groupBy(orderItems.name).orderBy(desc(sql`sum(${orderItems.quantity})`));

    // Clientes nuevos vs. recurrentes en el periodo (por correo)
    const customers = await this.db.select({ email: orders.customerEmail, first: sql<Date>`min(${orders.createdAt})` }).from(orders).where(inArray(orders.status, PAID)).groupBy(orders.customerEmail);
    const buyersNow = await this.db.select({ email: orders.customerEmail }).from(orders).where(paidIn(since, now)).groupBy(orders.customerEmail);
    const firstBy = new Map(customers.map((c) => [c.email, new Date(c.first)]));
    const newCustomers = buyersNow.filter((b) => (firstBy.get(b.email) ?? now) >= since).length;

    const lowStock = await this.db.select({ id: products.id, name: products.name, stock: products.stock }).from(products).where(and(eq(products.active, true), lte(products.stock, 5)));
    const [subs] = await this.db.select({ n: sql<number>`count(*)::int` }).from(subscribers);
    const [pendingManual] = await this.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, 'pending'), inArray(orders.paymentMethod, ['transfer', 'cod'])));
    const [toShip] = await this.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, ['paid', 'preparing']));

    const pct = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100));
    return {
      days,
      kpis: {
        sales: { value: cur.sales, change: pct(cur.sales, prev.sales) },
        orders: { value: cur.count, change: pct(cur.count, prev.count) },
        aov: { value: cur.count ? Math.round(cur.sales / cur.count) : 0, change: pct(cur.count ? cur.sales / cur.count : 0, prev.count ? prev.sales / prev.count : 0) },
        units: { value: units.n },
        discounts: { value: cur.discounts },
        newCustomers: { value: newCustomers, repeat: buyersNow.length - newCustomers },
      },
      daily, byStatus, byMethod, byCity, topProducts, lowStock,
      ops: { toShip: toShip.n, pendingConfirmation: pendingManual.n, subscribers: subs.n },
    };
  }

  /** Embudo de conversión por sesiones en el periodo: visitas → producto → carrito → checkout → compra. */
  async funnel(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const rows = await this.db.select({ type: events.type, sessions: sql<number>`count(distinct ${events.sessionId})::int`, n: sql<number>`count(*)::int` })
      .from(events).where(gte(events.createdAt, since)).groupBy(events.type);
    const by = Object.fromEntries(rows.map((r) => [r.type, r.sessions]));
    const steps = [
      ['page_view', 'Visitas'], ['product_view', 'Vieron un producto'], ['add_to_cart', 'Agregaron al carrito'], ['begin_checkout', 'Iniciaron el pago'], ['purchase', 'Compraron'],
    ].map(([type, label]) => ({ type, label, sessions: by[type] ?? 0 }));
    const visits = steps[0].sessions || 0;
    const conversion = visits ? Math.round(((by.purchase ?? 0) / visits) * 1000) / 10 : 0;
    // Sesiones que iniciaron el pago y no compraron: carritos abandonados
    const abandoned = Math.max(0, (by.begin_checkout ?? 0) - (by.purchase ?? 0));
    const assistant = rows.find((r) => r.type === 'assistant_query')?.n ?? 0;
    return { days, steps, conversion, abandoned, assistantQueries: assistant };
  }
}