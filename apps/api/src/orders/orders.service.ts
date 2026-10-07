import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { CreateOrderWithCoupon, OrderCreated, PublicOrder, CustomerOrderHistoryItem } from '@lacajita/shared';
import { DB, type Db } from '../db/db.module';
import { coupons, orderItems, orders, products, stockMovements, type OrderItemRow, type OrderRow } from '../db/schema';
import { PricingService } from './pricing.service';
import { CatalogService } from '../catalog/catalog.service';
import { WompiService, type WompiTransaction } from '../payments/wompi.service';
import { JOBS, JobsService } from '../jobs/jobs.service';
import { MailService } from '../notifications/mail.service';
import { newReference } from './shipping';

type ItemLite = Pick<OrderItemRow, 'name' | 'unitPrice' | 'quantity' | 'productId'>;

/**
 * Reglas de negocio de pedidos:
 *  - precios y envío siempre calculados en servidor;
 *  - inventario reservado al crear (bloqueo de fila) y devuelto si el pago falla, se cancela o se abandona;
 *  - transiciones de pago idempotentes: un evento repetido no hace nada.
 */
@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);
  private readonly otpCache = new Map<string, { code: string; expiresAt: number; used: boolean }>();

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly catalog: CatalogService,
    private readonly wompi: WompiService,
    private readonly jobs: JobsService,
    private readonly pricing: PricingService,
    private readonly mail: MailService,
  ) {}

  /** Solicita un código de verificación OTP para consultar el historial de compras por correo. */
  async requestHistoryOtp(email: string): Promise<{ ok: boolean; message: string; devCode?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // Validar si existen pedidos asociados a este correo
    const [found] = await this.db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.customerEmail, cleanEmail));
    const totalOrders = Number(found?.count || 0);
    if (totalOrders === 0) {
      throw new NotFoundException('No encontramos pedidos asociados a este correo. Verifica si realizaste tu compra con otro correo.');
    }

    // Generar código de 6 dígitos con 15 minutos de vigencia
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    this.otpCache.set(cleanEmail, { code, expiresAt, used: false });

    await this.mail.sendOtp(cleanEmail, code);

    return {
      ok: true,
      message: `Enviamos un código de 6 dígitos a ${cleanEmail}`,
      devCode: !this.mail.enabled ? code : undefined,
    };
  }

  /** Valida el código OTP y devuelve todas las compras del cliente directamente de la base de datos. */
  async verifyHistoryOtp(email: string, code: string): Promise<{ ok: boolean; email: string; orders: CustomerOrderHistoryItem[] }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const cached = this.otpCache.get(cleanEmail);
    if (!cached || cached.code !== cleanCode || cached.used || cached.expiresAt < Date.now()) {
      throw new BadRequestException('El código de verificación es incorrecto o ha expirado. Por favor solicita uno nuevo.');
    }

    cached.used = true;

    // Obtener todos los pedidos asociados al correo
    const orderRows = await this.db.select().from(orders).where(eq(orders.customerEmail, cleanEmail)).orderBy(desc(orders.createdAt));

    const result: CustomerOrderHistoryItem[] = [];
    for (const o of orderRows) {
      const items = await this.itemsOf(o.id);
      result.push({
        reference: o.reference,
        status: o.status as PublicOrder['status'],
        paymentMethod: o.paymentMethod as PublicOrder['paymentMethod'],
        subtotal: o.subtotal,
        shipping: o.shipping,
        discount: o.discount,
        total: o.total,
        tracking: o.tracking,
        carrier: o.carrier,
        city: o.city,
        department: o.department,
        eta: o.etaDays,
        createdAt: o.createdAt.toISOString(),
        items: items.map((i) => ({ name: i.name, unitPrice: i.unitPrice, quantity: i.quantity, productId: i.productId })),
      });
    }

    return { ok: true, email: cleanEmail, orders: result };
  }

  async create(input: CreateOrderWithCoupon): Promise<OrderCreated> {
    if (input.paymentMethod === 'wompi' && !this.wompi.enabled) throw new ConflictException('El pago en línea no está disponible en este momento.');

    const order = await this.db.transaction(async (tx) => {
      const ids = [...new Set(input.items.map((i) => i.productId))];
      await tx.select({ id: products.id }).from(products).where(inArray(products.id, ids)).for('update');   // bloquea inventario
      const q = await this.pricing.quote({ items: input.items, department: input.customer.department, coupon: input.coupon }, tx);
      if (q.stockError) throw new ConflictException(q.stockError);
      if (input.coupon && q.couponError) throw new ConflictException(q.couponError);
      if (input.paymentMethod === 'cod' && !q.codAvailable) throw new ConflictException('El pago contraentrega no está disponible para ese departamento.');

      const c = input.customer;
      const [order] = await tx.insert(orders).values({
        reference: newReference(new Date(), randomBytes(3).toString('hex')), status: 'pending', paymentMethod: input.paymentMethod,
        customerName: c.name, customerEmail: c.email.toLowerCase(), customerPhone: c.phone, customerDoc: c.doc || null,
        address: c.address, city: c.city, department: c.department, notes: c.notes || null,
        subtotal: q.subtotal, shipping: q.shipping, discount: q.discount, couponCode: q.coupon?.code ?? null, etaDays: q.eta, total: q.total, sessionId: input.sessionId ?? null,
      }).returning();

      await tx.insert(orderItems).values(q.items.map((l) => ({ orderId: order.id, productId: l.productId, name: l.name, unitPrice: l.unitPrice, quantity: l.quantity })));
      for (const l of q.items) {
        await tx.update(products).set({ stock: sql`${products.stock} - ${l.quantity}` }).where(eq(products.id, l.productId));
        await tx.insert(stockMovements).values({ productId: l.productId, delta: -l.quantity, reason: 'sale', orderId: order.id, actor: 'tienda' });
      }
      if (q.couponId) await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, q.couponId));
      return order;
    });

    let paymentUrl: string | null = null;
    if (order.paymentMethod === 'wompi') paymentUrl = this.wompi.checkoutUrl(order);
    else await this.jobs.send(JOBS.mailOrderConfirmed, { orderId: order.id }, { singletonKey: `confirm-${order.id}` });
    return { reference: order.reference, total: order.total, paymentUrl };
  }

  itemsOf(orderId: number) {
    return this.db.select({ name: orderItems.name, unitPrice: orderItems.unitPrice, quantity: orderItems.quantity, productId: orderItems.productId })
      .from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  /** Vista para el cliente: requiere su correo (o el id de transacción de Wompi al volver del pago). */
  async publicView(reference: string, email: string, txId?: string): Promise<PublicOrder> {
    let [o] = await this.db.select().from(orders).where(eq(orders.reference, reference));
    if (o && o.status === 'pending' && txId && this.wompi.enabled) {
      const tx = await this.wompi.getTransaction(txId);
      if (tx && tx.reference === o.reference) { await this.applyTransaction(tx); [o] = await this.db.select().from(orders).where(eq(orders.id, o.id)); }
    }
    const allowed = o && (email.toLowerCase() === o.customerEmail || (txId && o.wompiTransactionId === txId));
    if (!allowed) throw new NotFoundException('No encontramos un pedido con esos datos.');
    const items = await this.itemsOf(o.id);
    return {
      reference: o.reference, status: o.status as PublicOrder['status'], paymentMethod: o.paymentMethod as PublicOrder['paymentMethod'],
      subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, total: o.total, tracking: o.tracking, city: o.city, eta: o.etaDays, createdAt: o.createdAt.toISOString(),
      items: items.map(({ name, unitPrice, quantity }) => ({ name, unitPrice, quantity })),
    };
  }

  async markPaid(reference: string, txId: string, amountInCents?: number): Promise<OrderRow | null> {
    const changed = await this.db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.reference, reference)).for('update');
      if (!o || o.status !== 'pending') return null;
      if (amountInCents != null && Number(amountInCents) !== o.total * 100) { this.log.error(`Monto no coincide en ${reference}`); return null; }
      const [u] = await tx.update(orders).set({ status: 'paid', wompiTransactionId: txId, updatedAt: new Date() }).where(eq(orders.id, o.id)).returning();
      return u;
    });
    if (changed) await this.jobs.send(JOBS.mailOrderConfirmed, { orderId: changed.id }, { singletonKey: `confirm-${changed.id}` });
    return changed;
  }

  /** Libera el inventario de un pedido pendiente y lo cierra con el estado indicado. */
  async release(reference: string, newStatus: 'failed' | 'cancelled', txId?: string): Promise<OrderRow | null> {
    return this.db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.reference, reference)).for('update');
      if (!o || o.status !== 'pending') return null;
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      for (const i of items) if (i.productId) {
        await tx.update(products).set({ stock: sql`${products.stock} + ${i.quantity}` }).where(eq(products.id, i.productId));
        await tx.insert(stockMovements).values({ productId: i.productId, delta: i.quantity, reason: 'release', orderId: o.id, actor: 'sistema', note: newStatus === 'failed' ? 'pago rechazado' : 'pedido cancelado' });
      }
      const [u] = await tx.update(orders).set({ status: newStatus, wompiTransactionId: txId ?? o.wompiTransactionId, updatedAt: new Date() }).where(eq(orders.id, o.id)).returning();
      return u;
    });
  }

  async applyTransaction(t: WompiTransaction | undefined) {
    if (!t?.reference) return null;
    if (t.status === 'APPROVED') return this.markPaid(t.reference, t.id, t.amount_in_cents);
    if (['DECLINED', 'VOIDED', 'ERROR'].includes(t.status)) return this.release(t.reference, 'failed', t.id);
    return null;
  }

  /** Pedidos Wompi abandonados devuelven su inventario (lo programa el worker cada 10 minutos). */
  async expireStale(ttlMinutes: number) {
    const cutoff = new Date(Date.now() - ttlMinutes * 60000);
    const stale = await this.db.select({ reference: orders.reference }).from(orders)
      .where(and(eq(orders.status, 'pending'), eq(orders.paymentMethod, 'wompi'), lt(orders.createdAt, cutoff)));
    for (const s of stale) await this.release(s.reference, 'cancelled');
    if (stale.length) this.log.log(`${stale.length} pedidos sin pagar cancelados`);
  }
}
