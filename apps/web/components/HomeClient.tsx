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

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [msg, setMsg] = useState('');
  return (
    <section className="news" aria-labelledby="news-h">
      <div className="news-copy">
        <span className="news-badge">✦ Club Privado del Fogón</span>
        <h2 id="news-h">Únete a La Cajita</h2>
        <p>Tandas recién salidas del fogón, recetas de autor y beneficios exclusivos antes que nadie.</p>
        <span className="news-note">Sin spam · Solo cocina honesta y avisos de tandas frescas</span>
      </div>
      {state === 'done' ? (
        <div className="news-done-wrap">
          <p className="news-ok" role="status">🎉 ¡Listo! Ya haces parte de nuestra mesa. Bienvenido al fogón.</p>
        </div>
      ) : (
        <form
          className="news-form"
          onSubmit={async (e) => {
            e.preventDefault(); setState('busy'); setMsg('');
            try { await api.subscribe(email); setState('done'); } catch (err) { setMsg((err as Error).message); setState('idle'); }
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
          {msg && <p className="news-err" role="alert">{msg}</p>}
        </form>
      )}
    </section>
  );
}

export const BoxPrice = ({ products }: { products: Product[] }) => <span className="price lg">{cop(products.filter((p) => p.stock > 0).reduce((s, p) => s + p.price, 0))}</span>;
