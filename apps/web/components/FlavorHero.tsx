'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cop, type Product } from '@lacajita/shared';
import { heroTheme, sensory } from '@/lib/tints';
import { useTilt } from '@/lib/motion';
import { QtyButton } from './QtyButton';
import { Arrow, Star, Sparkle, Fire } from './icons';

const INTERVAL = 6000;

/** Portada sensorial interactiva con notas de cata flotantes, halos de luz y selector de sabores. */
export function FlavorHero({ products, brand = 'Pimentón de verdad. Sin atajos.' }: { products: Product[]; brand?: string }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const tilt = useTilt(12);
  const touch = useRef(0);
  const p = products[i];

  useEffect(() => {
    if (!auto || products.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % products.length), INTERVAL);
    return () => clearTimeout(t);
  }, [i, auto, products.length]);

  const pick = (n: number) => { setAuto(false); setI(n); };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) >= 40) pick((i + (dx < 0 ? 1 : products.length - 1)) % products.length);
  };

  const [bg, fg] = p ? heroTheme(p.slug) : ['#efe2c8', '#1a1714'];
  const s = p ? sensory(p.slug) : null;

  return (
    <section
      className="fhero"
      style={{ '--hbg': bg, '--hfg': fg, '--glow': s?.glow || 'rgba(0,0,0,0.2)' } as React.CSSProperties}
      aria-roledescription="carrusel"
      aria-label="Nuestros sabores"
      onMouseEnter={() => setAuto(false)}
      onFocus={() => setAuto(false)}
    >
      <div className="fhero-ambient" aria-hidden="true" />

      <div className="fhero-inner">
        <div className="fhero-copy">
          {/* Badge artesanal */}
          <div className="fhero-meta-pill">
            <span className="pill-dot" />
            <span>Bogotá D.C. · Lotes Cortos Hechos a Mano</span>
          </div>

          <h1 className="fhero-brand">{brand}</h1>

          {p ? (
            <div key={p.slug} className="fhero-swap" aria-live="polite">
              <div className="fhero-header-row">
                {p.kicker && <span className="fhero-kicker">{p.kicker}</span>}
                <div className="fhero-rating" aria-label="Calificación 4.9 de 5 estrellas">
                  <div className="stars">
                    <Star /><Star /><Star /><Star /><Star />
                  </div>
                  <span>4.9 (1.200+ mesas)</span>
                </div>
              </div>

              <h2>{p.name}</h2>
              <p className="fhero-tag">{p.tagline}</p>

              {/* Píldoras sensoriales en copy */}
              {s && (
                <div className="fhero-taste-pills">
                  <span className="taste-pill"><Fire width={14} height={14} /> {s.intensity}</span>
                  <span className="taste-pill"><Sparkle width={14} height={14} /> {s.texture}</span>
                </div>
              )}

              <div className="fhero-buy">
                <div className="fhero-price-wrap">
                  <span className="fhero-price-label">Precio frasco 200g</span>
                  <span className="fhero-price">{cop(p.price)}</span>
                </div>
                <div className="fhero-cta-group">
                  <QtyButton p={p} size="btn-lg" variant="light" />
                  <Link href={`/producto/${p.slug}`} className="fhero-more">
                    Ver notas de cata <Arrow width={16} height={16} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="fhero-swap"><h2>&nbsp;</h2></div>
          )}
        </div>

        {/* Escenario 3D con Jar y notas flotantes */}
        <div
          className="fhero-stage"
          ref={tilt}
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={onTouchEnd}
        >
          <span className="fhero-halo" aria-hidden="true" />
          <span className="fhero-glow-orb" aria-hidden="true" />

          {/* Notas de cata flotantes */}
          {s && (
            <div className="fhero-floating-notes" aria-hidden="true">
              <div className="fnote fnote-1">
                <span className="fnote-dot" />
                <span>{s.notes[0]}</span>
              </div>
              <div className="fnote fnote-2">
                <span className="fnote-dot" />
                <span>{s.notes[1]}</span>
              </div>
              <div className="fnote fnote-3">
                <span className="fnote-icon">🍴</span>
                <span>{s.pairingPill}</span>
              </div>
            </div>
          )}

          {p && (
            <img
              key={p.slug}
              src={p.image ?? ''}
              alt={`Frasco de ${p.name}`}
              className="fhero-jar"
              fetchPriority="high"
            />
          )}

          <span className="fhero-floor" aria-hidden="true" />
        </div>
      </div>

      {/* Selector de sabores / pestañas */}
      <div className="fhero-picker" role="tablist" aria-label="Elegir sabor">
        {products.map((x, n) => {
          const xs = sensory(x.slug);
          return (
            <button
              key={x.id}
              role="tab"
              aria-selected={n === i}
              className={`fhero-tab ${n === i ? 'on' : ''}`}
              onClick={() => pick(n)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') pick((n + 1) % products.length);
                if (e.key === 'ArrowLeft') pick((n - 1 + products.length) % products.length);
              }}
            >
              <div className="tab-thumb">
                <img src={x.image ?? ''} alt="" />
              </div>
              <div className="tab-text">
                <span className="tab-name">{x.name}</span>
                <span className="tab-hint">{xs.intensity}</span>
              </div>
              {n === i && auto && (
                <i className="fhero-progress" style={{ animationDuration: `${INTERVAL}ms` }} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
