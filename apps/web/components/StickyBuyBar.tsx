'use client';
import { cop, type Product } from '@lacajita/shared';
import { useCart, qtyOf } from '@/store/cart';
import { tint } from '@/lib/tints';
import { Plus } from './icons';

export function StickyBuyBar({ p }: { p: Product }) {
  const { lines, add } = useCart();
  const currentQty = qtyOf(lines, p.id);

  return (
    <div className="sticky-buy-bar" aria-label={`Comprar ${p.name}`}>
      <div className="sticky-buy-inner">
        <div className="sticky-buy-info">
          <span className="sticky-buy-img" style={{ '--tint': tint(p.slug) } as React.CSSProperties}>
            <img src={p.image ?? ''} alt="" />
          </span>
          <div className="sticky-buy-text">
            <span className="sticky-buy-name">{p.name}</span>
            <span className="sticky-buy-price">{cop(p.price)} · {p.sizeG}g</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-red btn-sm sticky-buy-btn"
          onClick={() => add(p, 1, true)}
          disabled={p.stock <= 0}
        >
          {p.stock <= 0 ? 'Agotado' : currentQty > 0 ? `Llevas ${currentQty} · +1` : <>Agregar <Plus width={14} height={14} /></>}
        </button>
      </div>
    </div>
  );
}
