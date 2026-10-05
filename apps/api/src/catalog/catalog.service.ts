import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { SiteContentSchema, type Product, type SiteContent, type StoreInfo } from '@lacajita/shared';
import { DB, type Db } from '../db/db.module';
import { content, products, settings, type ProductRow } from '../db/schema';
import { loadConfig } from '../config/config';

export const toPublic = (p: ProductRow): Product => ({
  id: p.id, slug: p.slug, name: p.name, kicker: p.kicker, tagline: p.tagline, description: p.description,
  pairing: p.pairing, price: p.price, sizeG: p.sizeG, stock: p.stock, image: p.image,
});

@Injectable()
export class CatalogService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(): Promise<Product[]> {
    const rows = await this.db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.sort));
    return rows.map(toPublic);
  }

  async bySlug(slug: string): Promise<Product> {
    const [p] = await this.db.select().from(products).where(and(eq(products.slug, slug), eq(products.active, true)));
    if (!p) throw new NotFoundException('Producto no encontrado.');
    return toPublic(p);
  }

  async settings(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(settings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  /** Textos editables de la tienda (preguntas frecuentes, portada). */
  async content(): Promise<SiteContent> {
    const [row] = await this.db.select().from(content).where(eq(content.key, 'site'));
    return SiteContentSchema.parse(row ? JSON.parse(row.value) : {});
  }
  async saveContent(c: SiteContent) {
    await this.db.insert(content).values({ key: 'site', value: JSON.stringify(c), updatedAt: new Date() }).onConflictDoUpdate({ target: content.key, set: { value: JSON.stringify(c), updatedAt: new Date() } });
    return c;
  }

  async storeInfo(): Promise<StoreInfo> {
    const s = await this.settings();
    const cfg = loadConfig();
    return {
      shipping: { flat: Number(s.shipping_flat || 0), local: Number(s.shipping_local || 0), localCity: s.shipping_local_city || '', freeFrom: Number(s.shipping_free_from || 0) },
      whatsapp: s.whatsapp || '',
      contact: { email: s.contact_email || '', phone: s.contact_phone || '', city: s.contact_city || '', instagram: s.instagram || '' },
      transferInstructions: s.transfer_instructions || '',
      paymentMethods: [...(cfg.wompi.enabled ? ['wompi' as const] : []), 'transfer', 'cod'],
    };
  }
}
