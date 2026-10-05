import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { JOBS, JobsService } from './jobs.service';
import { OrdersService } from '../orders/orders.service';
import { MailService } from '../notifications/mail.service';
import type { WompiTransaction } from '../payments/wompi.service';
import { DB, type Db } from '../db/db.module';
import { Inject } from '@nestjs/common';
import { messages, orderItems, orders, products } from '../db/schema';
import { and, gte, inArray, lte, sql } from 'drizzle-orm';
import { loadConfig } from '../config/config';

/** Qué hace cada trabajo. Los registra el worker (o la API en modo inline). */
@Injectable()
export class JobHandlers {
  private readonly log = new Logger(JobHandlers.name);
  constructor(private readonly jobs: JobsService, private readonly ordersSvc: OrdersService, private readonly mail: MailService, @Inject(DB) private readonly db: Db) {}

  async register() {
    await this.jobs.work<{ orderId: number }>(JOBS.mailOrderConfirmed, async ({ orderId }) => {
      const [o] = await this.db.select().from(orders).where(eq(orders.id, orderId));
      if (o) await this.mail.orderConfirmed(o, await this.ordersSvc.itemsOf(o.id));
    });
    await this.jobs.work<{ orderId: number }>(JOBS.mailOrderShipped, async ({ orderId }) => {
      const [o] = await this.db.select().from(orders).where(eq(orders.id, orderId));
      if (o) await this.mail.orderShipped(o);
    });
    await this.jobs.work<WompiTransaction>(JOBS.paymentsWompiEvent, (tx) => this.ordersSvc.applyTransaction(tx).then(() => undefined));
    await this.jobs.work<object>(JOBS.ordersExpire, () => this.ordersSvc.expireStale(loadConfig().pendingOrderTtlMinutes));
    await this.jobs.schedule(JOBS.ordersExpire, '*/10 * * * *');

    // Reporte diario de ventas al negocio (8 p. m. Bogotá) y alerta de inventario bajo (7 a. m.).
    await this.jobs.work<object>(JOBS.reportDaily, async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const paid = ['paid', 'preparing', 'shipped', 'delivered'];
      const [s] = await this.db.select({ sales: sql<number>`coalesce(sum(${orders.total}),0)::int`, n: sql<number>`count(*)::int` }).from(orders).where(and(inArray(orders.status, paid), gte(orders.createdAt, since)));
      const [u] = await this.db.select({ n: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int` }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(inArray(orders.status, paid), gte(orders.createdAt, since)));
      const [p] = await this.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, 'pending'));
      const top = await this.db.select({ name: orderItems.name, units: sql<number>`sum(${orderItems.quantity})::int` }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(inArray(orders.status, paid), gte(orders.createdAt, since))).groupBy(orderItems.name).orderBy(sql`sum(${orderItems.quantity}) desc`).limit(5);
      await this.mail.dailyReport({ date: since.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }), sales: s.sales, orders: s.n, units: u.n, pending: p.n, top });
    });
    await this.jobs.schedule(JOBS.reportDaily, '0 20 * * *');
    await this.jobs.work<object>(JOBS.inventoryLowStock, async () => {
      const low = await this.db.select({ name: products.name, stock: products.stock }).from(products).where(and(eq(products.active, true), lte(products.stock, 5)));
      await this.mail.lowStock(low);
    });
    await this.jobs.schedule(JOBS.inventoryLowStock, '0 7 * * *');
    await this.jobs.work<{ messageId: number }>(JOBS.mailContact, async ({ messageId }) => {
      const [m] = await this.db.select().from(messages).where(eq(messages.id, messageId));
      if (m) await this.mail.contactMessage(m);
    });
    this.log.log('Handlers de trabajos registrados');
  }
}
