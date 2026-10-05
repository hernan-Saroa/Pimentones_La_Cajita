import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cop } from '@lacajita/shared';
import { api, ApiError } from '@/lib/api';
import { SiteContentSchema, type Product, type SiteContent } from '@lacajita/shared';
import { tint, sensory } from '@/lib/tints';
import { BuyBox } from '@/components/BuyBox';
import { StickyBuyBar } from '@/components/StickyBuyBar';
import { ProductViewTracker } from '@/components/Tracker';
import { ProductCard } from '@/components/ProductCard';
import { Back, Leaf, Truck, Chevron, Sparkle, Fire } from '@/components/icons';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try { return (await api.products()).map((p) => ({ slug: p.slug })); } catch { return []; }
}

/** Cada frasco con su título, descripción e imagen para Google y para compartir por WhatsApp. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await api.product(slug);
    return { title: p.name, description: p.tagline ?? p.description.slice(0, 150), openGraph: { title: p.name, description: p.tagline ?? '', images: p.image ? [p.image] : ['/og.jpg'] } };
  } catch { return { title: 'Producto no encontrado' }; }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let p; try { p = await api.product(slug); } catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
  const [all, c] = await Promise.all([api.products(), api.content()]).catch(() => [[p!] as Product[], SiteContentSchema.parse({})] as [Product[], SiteContent]);
  const others = all.filter((x) => x.slug !== slug);
  const s = sensory(p.slug);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.tagline, image: p.image, sku: p.slug,
    brand: { '@type': 'Brand', name: 'Pimentones La Cajita' },
    offers: { '@type': 'Offer', priceCurrency: 'COP', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };

  return (
    <>
      <ProductViewTracker productId={p.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="section product">
        <div className="product-media" style={{ '--tint': tint(p.slug) } as React.CSSProperties}>
          <img src={p.image ?? ''} alt={`Frasco de ${p.name}`} style={{ viewTransitionName: `jar-${p.id}` } as React.CSSProperties} fetchPriority="high" />
          <div className="product-media-badge">
            <Sparkle width={12} height={12} />
            <span>Tandas cortas · Hecho a mano</span>
          </div>
        </div>

        <div className="product-copy">
          <Link href="/#tienda" className="back"><Back width={18} height={18} /> Tienda</Link>
          <span className="kicker-pill">{p.kicker || 'Cosecha Seleccionada'}</span>
          <h1>{p.name}</h1>
          <p className="product-price">{cop(p.price)} <span>· {p.sizeG} g</span></p>
          <p className="lead">{p.tagline}</p>

          {/* Medidor Organoléptico / Perfil Sensorial */}
          <div className="product-sensory-panel">
            <span className="sensory-panel-title">Perfil de Cata Artesanal:</span>
            <div className="sensory-meters">
              <div className="sensory-meter">
                <span className="meter-label">Ahumado al carbón</span>
                <div className="meter-dots">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <span key={idx} className={`dot ${idx <= s.smokeScore ? 'filled' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="sensory-meter">
                <span className="meter-label">Dulzor de huerta</span>
                <div className="meter-dots">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <span key={idx} className={`dot ${idx <= s.sweetScore ? 'filled' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="sensory-meter">
                <span className="meter-label">Densidad y textura</span>
                <div className="meter-dots">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <span key={idx} className={`dot ${idx <= s.textureScore ? 'filled' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="sensory-notes-chips">
              {s.notes.map((n) => (
                <span key={n} className="sensory-chip">✦ {n}</span>
              ))}
            </div>
          </div>

          <BuyBox p={p} />

          <ul className="mini-trust">
            <li><Leaf width={18} height={18} /> 100% Sin conservantes químicos</li>
            <li><Truck width={18} height={18} /> Despachos a toda Colombia</li>
            <li><Fire width={18} height={18} /> Asado a fuego directo</li>
          </ul>

          <div className="accordion">
            <details open>
              <summary>Descripción de la receta<Chevron /></summary>
              {p.description.split('\n').filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}
            </details>

            <details open>
              <summary>Cómo servirlo en casa · Consejo del Chef<Chevron /></summary>
              <p className="chef-tip-box">&ldquo;{s.chefIdea}&rdquo;</p>
              {p.pairing && <p className="pairing-callout"><strong>Maridajes ideales:</strong> {p.pairing}.</p>}
            </details>

            <details>
              <summary>Ingredientes limpios (Clean Label)<Chevron /></summary>
              <ul className="clean-ingredients-list">
                {s.cleanIngredients.map((ing) => (
                  <li key={ing}>✓ {ing}</li>
                ))}
              </ul>
              <p className="clean-label-note">Sin gomas artificiales, sin espesantes ni colorantes sintéticos.</p>
            </details>

            <details>
              <summary>Conservación y vida útil<Chevron /></summary>
              <p>{c.conservation}</p>
            </details>
          </div>
        </div>
      </section>

      {/* Barra de compra flotante para dispositivos móviles */}
      <StickyBuyBar p={p} />

      {others.length > 0 && (
        <section className="section also" aria-labelledby="also-h">
          <h2 id="also-h">Otros sabores de la cosecha</h2>
          <div className="grid also-grid">{others.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </>
  );
}
