import Link from 'next/link';
import type { Product } from '@lacajita/shared';
import { cop } from '@lacajita/shared';
import { tint, sensory } from '@/lib/tints';
import { QtyButton } from './QtyButton';

export function ProductCard({ p }: { p: Product }) {
  const s = sensory(p.slug);

  return (
    <article className="pcard" style={{ '--card-tint': tint(p.slug), '--card-glow': s.glow } as React.CSSProperties}>
      <Link
        href={`/producto/${p.slug}`}
        className="pcard-media"
        aria-label={`Ver notas y receta de ${p.name}`}
      >
        <span className="pcard-glow" aria-hidden="true" />
        
        {/* Badges superiores */}
        <div className="pcard-badges">
          {p.kicker && <span className="pcard-kicker">{p.kicker}</span>}
          {p.stock > 0 && p.stock <= 5 && <span className="badge-low">Últimos {p.stock}</span>}
        </div>

        <img
          src={p.image ?? ''}
          alt={`Frasco artesanal de ${p.name}`}
          loading="lazy"
          className="pcard-img"
          style={{ viewTransitionName: `jar-${p.id}` } as React.CSSProperties}
        />

        {/* Chip sensorial inferior */}
        <div className="pcard-sensory-chip">
          <span>{s.texture}</span>
        </div>
      </Link>

      <div className="pcard-info">
        <div className="pcard-title-row">
          <h3>
            <Link href={`/producto/${p.slug}`}>{p.name}</Link>
          </h3>
        </div>

        <p className="pcard-tag">{p.tagline}</p>

        {/* Maridaje recomendado */}
        <div className="pcard-pairing" title="Maridaje sugerido">
          <span className="pairing-icon">🍴</span>
          <span className="pairing-text">{s.pairingPill}</span>
        </div>

        <div className="pcard-buy">
          <div className="price-stack">
            <span className="price-unit">Frasco 200g</span>
            <span className="price">{cop(p.price)}</span>
          </div>
          <div className="pcard-action">
            <QtyButton p={p} size="btn-sm" />
          </div>
        </div>
      </div>
    </article>
  );
}
