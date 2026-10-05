'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cop, type Product, type Suggestion } from '@lacajita/shared';
import { api } from '@/lib/api';
import { track } from '@/lib/track';
import { tint } from '@/lib/tints';
import { useCart } from '@/store/cart';
import { QtyButton } from './QtyButton';
import { Arrow, Sparkle, Check } from './icons';

const OCCASIONS = [
  { label: 'Hamburguesas', icon: '🍔', query: 'Hamburguesas' },
  { label: 'Tabla de quesos', icon: '🧀', query: 'Tabla de quesos' },
  { label: 'Asado & Brasa', icon: '🥩', query: 'Asado' },
  { label: 'Pastas & Arroces', icon: '🍝', query: 'Pasta' },
  { label: 'Arepas & Desayuno', icon: '🍳', query: 'Desayuno con arepa' },
];

const HINTS = ['papas criollas…', 'una tabla con vino…', 'carne a la brasa…', 'arepas con queso…', 'sándwich gourmet…'];

/** Sommelier Culinario: el cliente cuenta el plato o elige una ocasión y recibe el maridaje exacto. */
export function Assistant({ products }: { products: Product[] }) {
  const { add } = useCart();
  const [text, setText] = useState('');
  const [activeOccasion, setActiveOccasion] = useState('');
  const [hint, setHint] = useState(0);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [res, setRes] = useState<Suggestion | null>(null);
  const [err, setErr] = useState('');
  const [comboAdded, setComboAdded] = useState(false);

  useEffect(() => { const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600); return () => clearInterval(t); }, []);

  const ask = async (q?: string) => {
    const v = (q ?? text).trim();
    if (v.length < 2) return;
    setText(v);
    setActiveOccasion(q || '');
    setState('busy');
    setErr('');
    setComboAdded(false);
    track('assistant_query', { meta: { q: v.slice(0, 60) } });
    try {
      const result = await api.suggest(v);
      setRes(result);
      setState('done');
    } catch (e) {
      setErr((e as Error).message);
      setState('idle');
    }
  };

  const picks = res ? res.slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p)) : [];
  const comboTotal = picks.reduce((s, p) => s + p.price, 0);

  const handleAddCombo = () => {
    if (picks.length === 0) return;
    picks.forEach((p, idx) => {
      add(p, 1, idx === picks.length - 1);
    });
    setComboAdded(true);
    setTimeout(() => setComboAdded(false), 2000);
  };

  return (
    <section className="assistant" aria-labelledby="as-h">
      <div className="as-head">
        <span className="kicker-pill">
          <Sparkle width={12} height={12} /> Sommelier Culinario
        </span>
        <h2 id="as-h">¿Qué vas a cocinar hoy?</h2>
        <p>Cuéntanos tu menú y te recomendamos el maridaje de conservas perfecto para tu mesa.</p>
      </div>

      <form className="as-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label htmlFor="as-in" className="sr-only">Plato o receta</label>
        <input
          id="as-in"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Ej.: ${HINTS[hint]}`}
          maxLength={200}
          autoComplete="off"
        />
        <button className="btn btn-red btn-lg" disabled={state === 'busy' || text.trim().length < 2}>
          {state === 'busy' ? 'Catando…' : <>Recomendar <Arrow width={18} height={18} /></>}
        </button>
      </form>

      <div className="as-ideas">
        {OCCASIONS.map((occ) => {
          const isActive = activeOccasion === occ.query;
          return (
            <button
              key={occ.label}
              type="button"
              className={`as-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => ask(occ.query)}
              disabled={state === 'busy'}
            >
              <span>{occ.icon}</span> {occ.label}
            </button>
          );
        })}
      </div>

      <div className="as-out" aria-live="polite">
        {err && <p className="notice notice-error">{err}</p>}
        {state === 'busy' && (
          <div className="as-loading">
            <span />
            <span />
          </div>
        )}

        {state === 'done' && res && (
          <div className="as-result-card">
            <div className="as-result-header">
              <span className="as-chef-badge">👨‍🍳 Consejo del Fogón:</span>
              <p className="as-tip">&ldquo;{res.tip}&rdquo;</p>
            </div>

            <div className="as-picks">
              {picks.map((p) => (
                <article key={p.id} className="as-pick-card">
                  <Link
                    href={`/producto/${p.slug}`}
                    className="as-pick-img"
                    style={{ '--tint': tint(p.slug) } as React.CSSProperties}
                  >
                    <img src={p.image ?? ''} alt={p.name} />
                  </Link>
                  <div className="as-pick-meta">
                    <span className="as-pick-kicker">{p.kicker || 'Artesanal'}</span>
                    <Link href={`/producto/${p.slug}`} className="as-pick-name">{p.name}</Link>
                    <p className="as-pick-price">{cop(p.price)}</p>
                    <QtyButton p={p} size="btn-sm" />
                  </div>
                </article>
              ))}
            </div>

            {picks.length > 1 && (
              <div className="as-combo-cta">
                <button
                  type="button"
                  className="btn btn-red btn-lg as-combo-btn"
                  onClick={handleAddCombo}
                  disabled={comboAdded}
                >
                  {comboAdded ? (
                    <>
                      <Check width={18} height={18} /> ¡Combo agregado al carrito!
                    </>
                  ) : (
                    <>
                      Agregar Combo Maridaje ({picks.length} frascos) · {cop(comboTotal)}
                    </>
                  )}
                </button>
                <p className="as-combo-sub">
                  Ambos frascos se complementan en texturas y aromas para esta preparación.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
