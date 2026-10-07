import { api, DEFAULT_STORE } from '@/lib/api';
import { SiteContentSchema, type Product, type StoreInfo, type SiteContent } from '@lacajita/shared';
import { cop } from '@lacajita/shared';
import { FlavorHero } from '@/components/FlavorHero';
import { BrandManifesto } from '@/components/BrandManifesto';
import { ProductCard } from '@/components/ProductCard';
import { BoxBuilder } from '@/components/BoxBuilder';
import { PairingGuide } from '@/components/PairingGuide';
import { Testimonials } from '@/components/Testimonials';
import { Newsletter } from '@/components/HomeClient';
import { FAQSection } from '@/components/FAQSection';
import { Reveal } from '@/lib/motion';
import { Leaf, Truck, Lock, Chevron } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const [products, store, c] = await Promise.all([
    api.products(),
    api.store(),
    api.content(),
  ]).catch(() => [[] as Product[], DEFAULT_STORE, SiteContentSchema.parse({})] as [Product[], StoreInfo, SiteContent]);

  const available = products.filter((p) => p.stock > 0);

  return (
    <>
      {/* 1. Hero sensorial con notas de cata y luz dinámica */}
      <FlavorHero
        products={products}
        brand={c.heroBrand}
        badge={c.heroBadge}
        ratingText={c.heroRatingText}
        cta={c.heroCta}
        productSlugs={c.heroProductSlugs}
      />

      {/* 2. Pilares de confianza estilo tarjeta premium */}
      <section className="trust-wrap" aria-label="Garantías de calidad">
        <ul className="trust" aria-label="Por qué comprar aquí">
          {(c.trustPillars || []).map((tp, idx) => (
            <li key={idx} className="trust-card">
              <span className="trust-icon">
                {tp.icon === 'truck' ? <Truck width={22} height={22} /> : tp.icon === 'lock' ? <Lock width={22} height={22} /> : <Leaf width={22} height={22} />}
              </span>
              <div className="trust-text">
                <b>{tp.title}</b>
                <span>
                  {tp.icon === 'truck' && store.shipping.freeFrom > 0
                    ? `Envío gratis desde ${cop(store.shipping.freeFrom)}`
                    : tp.desc}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Manifiesto Artesanal y Video Cinematográfico del Taller */}
      <Reveal>
        <BrandManifesto
          kicker={c.manifestoKicker}
          mission={c.mission}
          title={c.aboutTitle}
          text={c.aboutText}
          tagline={c.tagline}
          videoUrl={c.videoUrl}
          values={c.values}
        />
      </Reveal>

      {/* 4. Catálogo de productos con elevación 3D */}
      <section id="tienda" className="section catalog-section">
        <Reveal className="section-head">
          <div>
            <span className="kicker-pill">{c.catalogKicker || 'Frascos Individuales'}</span>
            <h2>{c.catalogTitle || 'Nuestra Colección de Frascos'}</h2>
          </div>
          <p className="catalog-subtitle">{c.catalogSubtitle || 'Tandas cortas en frascos de vidrio de 200 g. Sin químicos ni espesantes.'}</p>
        </Reveal>
        <div className="grid">
          {products.map((p, n) => (
            <Reveal key={p.id} delay={n * 70} className="pcard-wrap">
              <ProductCard p={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. Configurador interactivo "Arma tu Cajita de Madera" */}
      {available.length > 1 && (
        <Reveal>
          <BoxBuilder
            products={products}
            giftKicker={c.giftKicker || 'Edición Especial'}
            giftTitle={c.giftTitle || 'Caja de Madera Artesanal'}
            giftText={c.giftText || 'El regalo definitivo para amantes de la buena cocina. Escoge tus frascos favoritos.'}
            capacity={(c as any).giftCapacity ?? 4}
            discountPct={(c as any).giftDiscountPct ?? 0}
            pricingMode={(c as any).giftPricingMode ?? 'sum'}
            fixedPrice={(c as any).giftFixedPrice ?? 0}
            productSlugs={(c as any).giftProductSlugs ?? []}
          />
        </Reveal>
      )}

      {/* 6. Guía de Maridajes Culinarios por ocasión */}
      <Reveal>
        <PairingGuide
          products={products}
          kicker={c.pairingKicker}
          title={c.pairingTitle}
          subtitle={c.pairingSubtitle}
          items={(c as any).pairingItems}
        />
      </Reveal>

      {/* 8. Ticker de valores en movimiento */}
      <div className="ticker" aria-hidden="true">
        <div>
          {[...c.values, ...c.values].map((v, i) => (
            <span key={i}>✦ {v}</span>
          ))}
        </div>
      </div>

      {/* 9. Testimonios de clientes reales */}
      <Reveal>
        <Testimonials reviews={c.testimonials} />
      </Reveal>

      {/* 13. Preguntas frecuentes con diseño World-Class */}
      {c.faq && c.faq.length > 0 && (
        <FAQSection
          kicker={c.faqKicker}
          title={c.faqTitle}
          subtitle={c.faqSubtitle}
          items={c.faq}
          whatsappUrl={store?.whatsapp ? `https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=Hola%20taller%20La%20Cajita,%20tengo%20una%20pregunta%20sobre%20sus%20productos.` : undefined}
          whatsappPhone={store?.contact?.phone}
        />
      )}

      {/* 14. Boletín para recetas exclusivas */}
      <Newsletter
        kicker={c.newsletterKicker}
        title={c.newsletterTitle}
        subtitle={c.newsletterSubtitle}
        note={c.newsletterNote}
        consentText={(c as any).newsletterConsentText}
      />
    </>
  );
}
