'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Product, PairingItem } from '@lacajita/shared';
import { cop } from '@lacajita/shared';
import { QtyButton } from './QtyButton';
import { Arrow, Sparkle } from './icons';

interface PairingGuideProps {
  products: Product[];
  kicker?: string;
  title?: string;
  subtitle?: string;
  items?: PairingItem[];
}

function getPairingIcon(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('queso') || t.includes('tabla') || t.includes('vino')) return '🧀';
  if (t.includes('hamburguesa') || t.includes('sandwich') || t.includes('sándwich')) return '🍔';
  if (t.includes('carne') || t.includes('asado') || t.includes('brasa') || t.includes('parrilla')) return '🥩';
  if (t.includes('arepa') || t.includes('desayuno') || t.includes('dulce') || t.includes('galleta')) return '🫓';
  return '🌶️';
}

export function PairingGuide({
  products,
  kicker = 'Inspiración en la Cocina',
  title = '¿Cómo disfrutar cada sabor en tu mesa?',
  subtitle = 'Nuestras conservas no son solo aderezos: son el toque secreto para transformar platos cotidianos en momentos gourmet memorables.',
  items,
}: PairingGuideProps) {
  const pairingItems = useMemo(() => {
    if (items && Array.isArray(items) && items.length > 0) {
      const activeList = items.filter((it) => it.active !== false);
      if (activeList.length > 0) {
        return activeList.map((it, idx) => {
          const matchedProduct =
            products.find((p) => p.slug === it.productSlug) ||
            products.find((p) => String(p.id) === it.productSlug) ||
            null;
          const icon = it.icon || (matchedProduct ? getPairingIcon(`${matchedProduct.slug} ${matchedProduct.name} ${it.dish}`) : '🧀');
          return {
            id: it.id || `pair-${idx}`,
            title: it.title || matchedProduct?.name || 'Maridaje recomendado',
            icon,
            dish: it.dish || matchedProduct?.pairing || 'Ideal para acompañar tus platos favoritos',
            slug: matchedProduct?.slug || it.productSlug || '',
            tip: it.tip || matchedProduct?.tagline || 'El toque artesanal que transforma cualquier preparación.',
            badge: it.badge || matchedProduct?.kicker || 'Maridaje recomendado',
            image: it.image || matchedProduct?.image || '',
            product: matchedProduct,
          };
        });
      }
    }

    const list = products.filter((p) => p.pairing && p.pairing.trim().length > 0);
    if (list.length === 0) return [];
    return list.map((p) => {
      const icon = getPairingIcon(`${p.slug} ${p.name} ${p.pairing}`);
      const title = p.kicker ? `${p.kicker} · ${p.name}` : p.name;
      return {
        id: String(p.id),
        title,
        icon,
        dish: p.pairing || 'Ideal para acompañar tus platos favoritos',
        slug: p.slug,
        tip: p.tagline || `El toque artesanal que transforma cualquier preparación con ${p.name}.`,
        badge: p.kicker || 'Maridaje recomendado',
        image: p.image || '',
        product: p,
      };
    });
  }, [products, items]);

  const [activeId, setActiveId] = useState<string>('');

  if (pairingItems.length === 0) return null;

  const current = pairingItems.find((item) => item.id === (activeId || pairingItems[0].id)) || pairingItems[0];
  const matchedProduct = current.product;

  return (
    <section id="maridajes" className="section pairing-guide" aria-labelledby="pair-title">
      <div className="pairing-header">
        <span className="kicker-pill">{kicker}</span>
        <h2 id="pair-title">{title}</h2>
        <p className="pairing-lead">{subtitle}</p>
      </div>

      {/* Selector de ocasión / plato dinámico */}
      <div className="pairing-tabs" role="tablist">
        {pairingItems.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={current.id === item.id}
            className={`pairing-tab ${current.id === item.id ? 'active' : ''}`}
            onClick={() => setActiveId(item.id)}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-title">{item.title}</span>
          </button>
        ))}
      </div>

      {/* Tarjeta de maridaje activo */}
      <div className="pairing-showcase">
        <div className="pairing-copy">
          <div className="pairing-badge">
            <Sparkle width={14} height={14} />
            <span>{current.badge}</span>
          </div>
          <h3>{current.title}</h3>
          <p className="pairing-dish"><b>Maridajes y preparaciones ideales:</b> {current.dish}</p>
          <p className="pairing-tip">“{current.tip}”</p>

          {matchedProduct && (
            <div className="pairing-action-card">
              <div className="action-product-info">
                <span className="action-recom">Frasco recomendado:</span>
                <strong>{matchedProduct.name}</strong>
                <span className="action-price">{cop(matchedProduct.price)}</span>
              </div>
              <div className="action-buttons">
                <QtyButton p={matchedProduct} size="btn-sm" />
                <Link href={`/producto/${matchedProduct.slug}`} className="btn btn-outline btn-sm">
                  Ver receta <Arrow width={14} height={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {(current.image || matchedProduct?.image) && (
          <div className="pairing-media">
            <div className="pairing-jar-spotlight">
              <img
                src={current.image || matchedProduct?.image || ''}
                alt={`Frasco o receta de ${current.title}`}
                className="spotlight-jar"
              />
              <div className="spotlight-aura" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
