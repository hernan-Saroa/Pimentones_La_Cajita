'use client';
import type { Product } from '@lacajita/shared';
import { useCart, qtyOf } from '@/store/cart';
import { Plus, Minus } from './icons';

/** "Agregar" que se convierte en − n + una vez en el carrito: comprar sin salir de la página. */
export function QtyButton({ p, size = '', variant = '' }: { p: Product; size?: string; variant?: 'light' | '' }) {
  const { lines, add, setQty } = useCart();
  const q = qtyOf(lines, p.id);
  if (p.stock <= 0) return <button className={`btn btn-soft ${size}`} disabled>Agotado</button>;
  if (q === 0) {
    return (
      <button className={`btn ${variant === 'light' ? 'btn-light' : 'btn-dark'} ${size}`} onClick={() => add(p, 1)} aria-label={`Agregar ${p.name} al carrito`}>
        <Plus width={18} height={18} /> Agregar
      </button>
    );
  }
  return (
    <div className={`stepper ${size} ${variant === 'light' ? 'stepper-light' : ''}`} role="group" aria-label={`Cantidad de ${p.name}`}>
      <button onClick={() => setQty(p.id, q - 1)} aria-label="Quitar uno"><Minus width={18} height={18} /></button>
      <span aria-live="polite">{q}</span>
      <button onClick={() => setQty(p.id, q + 1)} disabled={q >= p.stock} aria-label="Agregar uno"><Plus width={18} height={18} /></button>
    </div>
  );
}
