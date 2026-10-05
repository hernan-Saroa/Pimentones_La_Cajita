import { Injectable, Logger } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { loadConfig } from '../config/config';

export interface WompiTransaction { id: string; status: string; reference: string; amount_in_cents: number }
export interface WompiEvent { event: string; timestamp: number | string; signature: { properties: string[]; checksum: string }; data: { transaction?: WompiTransaction } }

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Integración con Wompi (Bancolombia): Web Checkout con firma de integridad y verificación de eventos. */
@Injectable()
export class WompiService {
  private readonly log = new Logger(WompiService.name);
  private readonly cfg = loadConfig().wompi;
  private readonly publicUrl = loadConfig().publicUrl;

  get enabled() { return this.cfg.enabled; }

  /** SHA256(referencia + montoEnCentavos + moneda + secretoIntegridad) */
  integritySignature(reference: string, amountInCents: number, currency = 'COP', secret = this.cfg.integritySecret) {
    return sha256(`${reference}${amountInCents}${currency}${secret}`);
  }

  checkoutUrl(o: { reference: string; total: number; customerEmail: string; customerName: string; customerPhone: string }) {
    const amountInCents = o.total * 100;
    const p = new URLSearchParams({
      'public-key': this.cfg.publicKey, currency: 'COP', 'amount-in-cents': String(amountInCents), reference: o.reference,
      'signature:integrity': this.integritySignature(o.reference, amountInCents),
      'redirect-url': `${this.publicUrl}/pedido/${o.reference}`,
      'customer-data:email': o.customerEmail, 'customer-data:full-name': o.customerName,
      'customer-data:phone-number': o.customerPhone.replace(/\D/g, '').slice(-10), 'customer-data:phone-number-prefix': '+57',
    });
    return `https://checkout.wompi.co/p/?${p.toString()}`;
  }

  /** checksum = SHA256(valores de signature.properties concatenados + timestamp + secreto de eventos) */
  verifyEvent(body: WompiEvent, secret = this.cfg.eventsSecret): boolean {
    try {
      const values = body.signature.properties.map((path) => path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), body.data));
      const expected = sha256(values.join('') + body.timestamp + secret);
      const got = String(body.signature.checksum || '').toLowerCase();
      return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
    } catch { return false; }
  }

  /** Consulta pública de una transacción (respaldo si el webhook se demora). */
  async getTransaction(id: string): Promise<WompiTransaction | null> {
    try {
      const r = await fetch(`${this.cfg.apiBase}/transactions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) return null;
      return ((await r.json()) as { data?: WompiTransaction }).data ?? null;
    } catch (e) { this.log.warn(`Wompi no respondió: ${(e as Error).message}`); return null; }
  }
}
