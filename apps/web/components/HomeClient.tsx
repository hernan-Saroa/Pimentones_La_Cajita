'use client';
import { useState } from 'react';
import { cop, type Product } from '@lacajita/shared';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';

/** Botón de la caja regalo: agrega todos los sabores disponibles y abre el carrito. */
export function GiftButton({ products }: { products: Product[] }) {
  const { add } = useCart();
  const available = products.filter((p) => p.stock > 0);
  return (
    <button className="btn btn-red btn-lg" onClick={() => available.forEach((p, i) => add(p, 1, i === available.length - 1))}>
      Agregar la caja
    </button>
  );
}

interface NewsletterProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  note?: string;
  consentText?: string;
}

export function Newsletter({
  kicker = '✦ Club Privado del Fogón',
  title = 'Únete a La Cajita',
  subtitle = 'Tandas recién salidas del fogón, recetas de autor y beneficios exclusivos antes que nadie.',
  note = 'Sin spam · Solo cocina honesta y avisos de tandas frescas',
  consentText = 'Autorizo el tratamiento de mis datos personales según la Política de Privacidad (Ley 1581 de 2012).',
}: NewsletterProps = {}) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [msg, setMsg] = useState('');
  return (
    <section className="news" aria-labelledby="news-h">
      <div className="news-copy">
        <span className="news-badge">{kicker}</span>
        <h2 id="news-h">{title}</h2>
        <p>{subtitle}</p>
        <span className="news-note">{note}</span>
      </div>
      {state === 'done' ? (
        <div className="news-done-wrap">
          <p className="news-ok" role="status">🎉 ¡Listo! Ya haces parte de nuestra mesa. Bienvenido al fogón.</p>
        </div>
      ) : (
        <form
          className="news-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!consent) {
              setMsg('Debes autorizar el tratamiento de datos personales para unirte.');
              return;
            }
            setState('busy');
            setMsg('');
            try {
              await api.subscribe(email, consent);
              setState('done');
            } catch (err) {
              setMsg((err as Error).message);
              setState('idle');
            }
          }}
        >
          <label className="sr-only" htmlFor="news-email">Correo electrónico</label>
          <div className="news-input-wrap">
            <input
              id="news-email"
              type="email"
              required
              placeholder="Escribe tu correo personal…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button className="btn btn-dark btn-lg" disabled={state === 'busy'}>
              {state === 'busy' ? 'Enviando…' : 'Suscribirme'}
            </button>
          </div>
          <label className="news-consent-wrap">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="news-consent-checkbox"
            />
            <span className="news-consent-text">{consentText}</span>
          </label>
          {msg && <p className="news-err" role="alert">{msg}</p>}
        </form>
      )}
    </section>
  );
}

export const BoxPrice = ({ products }: { products: Product[] }) => <span className="price lg">{cop(products.filter((p) => p.stock > 0).reduce((s, p) => s + p.price, 0))}</span>;
