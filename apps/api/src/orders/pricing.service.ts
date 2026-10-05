import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { Quote, QuoteRequest } from '@lacajita/shared';
import { DB, type Db } from '../db/db.module';
import { coupons, products, settings, shippingZones } from '../db/schema';
import { norm } from './shipping';

export interface PricedItem { productId: number; name: string; unitPrice: number; quantity: number; stock: number }
export interface Priced extends Quote { items: PricedItem[]; couponId: number | null; stockError: string | null }

/**
 * Una sola función decide precios, envío y descuentos; la usan la cotización del checkout y la creación del pedido.
 * Así lo que el cliente ve es exactamente lo que se cobra.
 */
@Injectable()
export class PricingService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async quote(req: QuoteRequest, tx: Db = this.db): Promise<Priced> {
    const ids = [...new Set(req.items.map((i) => i.productId))];
    const rows = await tx.select().from(products).where(and(inArray(products.id, ids), eq(products.active, true)));
    const byId = new Map(rows.map((p) => [p.id, p]));
    let stockError: string | null = null;
    const items: PricedItem[] = [];
    for (const it of req.items) {
      const p = byId.get(it.productId);
      if (!p) { stockError = 'Uno de los productos ya no está disponible.'; continue; }
      if (p.stock < it.quantity) stockError = `Solo quedan ${p.stock} frascos de ${p.name}.`;
      items.push({ productId: p.id, name: p.name, unitPrice: p.price, quantity: it.quantity, stock: p.stock });
    }
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const s = Object.fromEntries((await tx.select().from(settings)).map((r) => [r.key, r.value]));
    const freeShippingFrom = Number(s.shipping_free_from || 0);
    const zone = req.department ? (await tx.select().from(shippingZones).where(eq(shippingZones.active, true))).find((z) => norm(z.department) === norm(req.department)) : undefined;
    let shipping = zone ? zone.rate : Number(s.shipping_flat || 0);
    const eta = zone ? (zone.daysMin === zone.daysMax ? `${zone.daysMax} día${zone.daysMax === 1 ? '' : 's'} hábil${zone.daysMax === 1 ? '' : 'es'}` : `${zone.daysMin} a ${zone.daysMax} días hábiles`) : null;
    const codAvailable = zone ? zone.codAvailable : false;
    if (freeShippingFrom > 0 && subtotal >= freeShippingFrom) shipping = 0;

    // Cupón
    let discount = 0; let coupon: Quote['coupon'] = null; let couponError: string | null = null; let couponId: number | null = null;
    const code = req.coupon?.trim().toUpperCase();
    if (code) {
      const [c] = await tx.select().from(coupons).where(eq(coupons.code, code));
      const now = new Date();
      if (!c || !c.active) couponError = 'Ese código no existe o ya no está activo.';
      else if (c.startsAt && c.startsAt > now) couponError = 'Ese código aún no está vigente.';
      else if (c.endsAt && c.endsAt < now) couponError = 'Ese código ya venció.';
      else if (c.maxUses != null && c.usedCount >= c.maxUses) couponError = 'Ese código ya alcanzó su límite de usos.';
      else if (subtotal < c.minSubtotal) couponError = `Ese código aplica desde $${c.minSubtotal.toLocaleString('es-CO')} en frascos.`;
      else {
        couponId = c.id;
        if (c.type === 'percent') discount = Math.round(subtotal * Math.min(c.value, 100) / 100);
        else if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
        else { discount = shipping; shipping = 0; }
        const label = c.type === 'percent' ? `${c.value}% de descuento` : c.type === 'fixed' ? `$${c.value.toLocaleString('es-CO')} de descuento` : 'Envío gratis';
        coupon = { code: c.code, type: c.type as 'percent' | 'fixed' | 'free_shipping', label };
      }
    }
    const total = Math.max(0, subtotal + shipping - (coupon?.type === 'free_shipping' ? 0 : discount));
    return { items, subtotal, shipping, discount, total, freeShippingFrom, eta, codAvailable, coupon, couponError, couponId, stockError };
  }
}
