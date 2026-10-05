'use client';
import { useState } from 'react';
import { cop, type Product } from '@lacajita/shared';
import { useCart } from '@/store/cart';
import { Plus, Minus } from './icons';

/** Cantidad + Agregar al carrito con apertura inmediata del drawer. */
export function BuyBox({ p }: { p: Product }) {
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const out = p.stock <= 0;
  const buy = () => add(p, qty, true);

  return (
    <>
      <div className="buy-row">
        <div className="stepper btn-lg" role="group" aria-label="Cantidad">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Quitar uno" disabled={qty <= 1}><Minus /></button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(p.stock, qty + 1))} disabled={qty >= p.stock} aria-label="Agregar uno"><Plus /></button>
        </div>
        <button className="btn btn-red btn-lg grow" disabled={out} onClick={buy}>{out ? 'Agotado' : `Agregar · ${cop(p.price * qty)}`}</button>
      </div>
      {!out && p.stock <= 5 && <p className="low">Quedan {p.stock} frascos de esta tanda.</p>}
    </>
  );
}
