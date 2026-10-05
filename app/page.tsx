import { api, DEFAULT_STORE } from '@/lib/api';
import { SiteContentSchema, type Product, type StoreInfo, type SiteContent } from '@lacajita/shared';
import { cop } from '@lacajita/shared';
import { FlavorHero } from '@/components/FlavorHero';
import { Assistant } from '@/components/Assistant';
import { BrandManifesto } from '@/components/BrandManifesto';
import { ProductCard } from '@/components/ProductCard';
import { BoxBuilder } from '@/components/BoxBuilder';
import { PairingGuide } from '@/components/PairingGuide';
import { ArtisanProcess } from '@/components/ArtisanProcess';
import { Testimonials } from '@/components/Testimonials';
import { Newsletter } from '@/components/HomeClient';
import { Reveal } from '@/lib/motion';
import { Leaf, Truck, Lock, Chevron } from '@/components/icons';

export const revalidate = 60; // el catálogo se regenera en segundo plano cada minuto

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
      <FlavorHero products={products} brand={c.heroBrand} />

      {/* 2. Pilares de confianza estilo tarjeta premium */}
      <section className="trust-wrap" aria-label="Garantías de calidad">
        <ul className="trust" aria-label="Por qué comprar aquí">
          <li className="trust-card">
            <span className="trust-icon"><Leaf width={22} height={22} /></span>
            <div className="trust-text">
              <b>100% Sin Conservantes</b>
              <span>Solo ingredientes reales que se entienden y cuidan tu salud.</span>
            </div>
          </li>
          <li className="trust-card">
            <span className="trust-icon"><Truck width={22} height={22} /></span>
            <div className="trust-text">
              <b>Despacho a Toda Colombia</b>
              <span>{store.shipping.freeFrom > 0 ? `Envío gratis desde ${cop(store.shipping.freeFrom)}` : 'Envíos rápidos con guía de rastreo'}</span>
            </div>
          </li>
          <li className="trust-card">
            <span className="trust-icon"><Lock width={22} height={22} /></span>
            <div className="trust-text">
              <b>Pago Fácil & Protegido</b>
              <span>Tarjeta, PSE, Nequi, Bancolombia o pago contraentrega.</span>
            </div>
          </li>
        </ul>
      </section>

      {/* 3. Manifiesto Artesanal y Video Cinematográfico del Taller */}
      <Reveal>
        <BrandManifesto
          mission={c.mission}
          title={c.aboutTitle}
          text={c.aboutText}
          tagline={c.tagline}
          videoUrl={c.videoUrl}
        />
      </Reveal>

      {/* 4. Catálogo de productos con elevación 3D */}
      <section id="tienda" className="section catalog-section">
        <Reveal className="section-head">
          <div>
            <span className="kicker-pill">Frascos Individuales</span>
            <h2>Nuestra Colección de Frascos</h2>
          </div>
          <p className="catalog-subtitle">Tandas cortas en frascos de vidrio de 200 g. Sin químicos ni espesantes.</p>
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
            giftTitle={c.giftTitle || 'Caja de Madera Artesanal'}
            giftText={c.giftText || 'El regalo definitivo para amantes de la buena cocina. Escoge tus frascos favoritos.'}
          />
        </Reveal>
      )}

      {/* 6. Guía de Maridajes Culinarios por ocasión */}
      <Reveal>
        <PairingGuide products={products} />
      </Reveal>

      {/* 7. Proceso Artesanal: "De la Huerta a tu Mesa" */}
      <Reveal>
        <ArtisanProcess />
      </Reveal>

      {/* 9. Asistente interactivo de recetas */}
      <Reveal>
        <Assistant products={products} />
      </Reveal>

      {/* 10. Ticker de valores en movimiento */}
      <div className="ticker" aria-hidden="true">
        <div>
          {[...c.values, ...c.values].map((v, i) => (
            <span key={i}>✦ {v}</span>
          ))}
        </div>
      </div>

      {/* 11. Testimonios de clientes reales */}
      <Reveal>
        <Testimonials />
      </Reveal>

      {/* 12. Filosofía Slow Food heredada */}
      <Reveal as="section" className="slow" aria-label="Nuestra forma de cocinar">
        <img src="/img/fotos/diagonal.webp" alt="Frascos de conservas artesanales" loading="lazy" />
        <div className="slow-copy">
          <span className="kicker-pill">Cocina sin Afán</span>
          <h2>{c.slowTitle}</h2>
          <p>{c.slowText}</p>
        </div>
      </Reveal>

      {/* 13. Preguntas frecuentes con diseño enriquecido */}
      {c.faq.length > 0 && (
        <section className="section faq" aria-labelledby="faq-h">
          <div className="faq-side">
            <span className="kicker-pill">Dudas Resueltas</span>
            <h2 id="faq-h">Preguntas frecuentes</h2>
            <p className="faq-side-desc">Todo sobre nuestros envíos, tiempos de entrega y conservación en casa.</p>
          </div>
          <div className="faq-list">
            {c.faq.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>
                  <span>{f.q}</span>
                  <Chevron />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* 14. Boletín para recetas exclusivas */}
      <Newsletter />
    </>
  );
}
