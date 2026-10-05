'use client';
import { useState } from 'react';
import { cop, type Product } from '@lacajita/shared';
import { useCart } from '@/store/cart';
import { Check, Sparkle } from './icons';
import { tint } from '@/lib/tints';

interface BoxBuilderProps {
  products: Product[];
  giftTitle: string;
  giftText: string;
}

export function BoxBuilder({ products, giftTitle, giftText }: BoxBuilderProps) {
  const { add, gift, setGift } = useCart();
  const available = products.filter((p) => p.stock > 0);

  // Selecciones por defecto: 1 de cada producto disponible (hasta 4)
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() => {
    return available.slice(0, 4).map((p) => p.slug);
  });

  const [ribbon, setRibbon] = useState<'rojo' | 'dorado' | 'natural'>('rojo');
  const [isAdding, setIsAdding] = useState(false);

  const selectedProducts = selectedSlugs
    .map((slug) => available.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));

  const totalNormal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const finalPrice = totalNormal;

  const toggleProduct = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      if (selectedSlugs.length > 2) {
        setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
      }
    } else {
      if (selectedSlugs.length < 4) {
        setSelectedSlugs([...selectedSlugs, slug]);
      }
    }
  };

  const setAllFour = () => {
    setSelectedSlugs(available.slice(0, 4).map((p) => p.slug));
  };

  const handleAddBox = () => {
    if (selectedProducts.length === 0) return;
    setIsAdding(true);
    setGift({
      isGift: true,
      message: gift.message || `Caja artesanal con lazo ${ribbon}.`,
    });
    selectedProducts.forEach((p, idx) => {
      add(p, 1, idx === selectedProducts.length - 1);
    });
    setTimeout(() => setIsAdding(false), 800);
  };

  return (
    <section id="caja" className="section box-experience" aria-labelledby="box-title">
      <div className="box-experience-inner">
        {/* Lado izquierdo: Visualizador de la Caja */}
        <div className="box-visual">
          <div className="box-badge-floating">
            <span className="spark"><Sparkle width={14} height={14} /></span>
            <span>Empaque de Madera Artesanal Incluido</span>
          </div>

          <div className="box-photo-wrap">
            <img
              src="/img/fotos/caja-calida.webp"
              alt="Caja artesanal de madera con lazo"
              className="box-main-photo"
              loading="lazy"
            />
            <div className="box-ribbon-tag">
              <span>Lazo {ribbon} · Tarjeta dedicatoria</span>
            </div>
          </div>

          {/* Ranuras interactivas de los frascos en la caja */}
          <div className="box-slots" aria-label="Frascos seleccionados en la caja">
            {[0, 1, 2, 3].map((slotIdx) => {
              const p = selectedProducts[slotIdx];
              return (
                <div key={slotIdx} className={`box-slot ${p ? 'filled' : 'empty'}`}>
                  {p ? (
                    <div className="slot-item" style={{ '--slot-tint': tint(p.slug) } as React.CSSProperties}>
                      <img src={p.image ?? ''} alt={p.name} />
                      <span className="slot-name">{p.name.split(' ')[0]}</span>
                    </div>
                  ) : (
                    <div className="slot-placeholder">
                      <span>Espacio {slotIdx + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lado derecho: Configurador y Venta */}
        <div className="box-config">
          <div className="box-header">
            <span className="kicker-pill">Edición Para Regalar</span>
            <h2 id="box-title">{giftTitle}</h2>
            <p className="box-desc">{giftText}</p>
          </div>

          {/* Selector de sabores para la caja */}
          <div className="box-flavor-picker">
            <div className="picker-title-row">
              <span className="picker-title">Elige los frascos de tu caja ({selectedSlugs.length}/4):</span>
              {selectedSlugs.length < 4 && (
                <button type="button" className="picker-quick-btn" onClick={setAllFour}>
                  Llenar los 4 sabores
                </button>
              )}
            </div>

            <div className="flavor-options">
              {available.map((prod) => {
                const isSelected = selectedSlugs.includes(prod.slug);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    className={`flavor-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleProduct(prod.slug)}
                    aria-pressed={isSelected}
                  >
                    <span className="chip-check">{isSelected ? <Check width={12} height={12} /> : '+'}</span>
                    <span className="chip-name">{prod.name}</span>
                    <span className="chip-price">{cop(prod.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opciones de lazo de regalo */}
          <div className="box-addons">
            <span className="addons-title">Color de lazo artesanal:</span>
            <div className="ribbon-choices">
              {(['rojo', 'dorado', 'natural'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ribbon-choice ${ribbon === r ? 'active' : ''}`}
                  onClick={() => setRibbon(r)}
                >
                  <span className={`ribbon-dot ribbon-${r}`} />
                  <span className="ribbon-label">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen de compra de la caja */}
          <div className="box-purchase-card">
            <div className="purchase-details">
              <div>
                <span className="purchase-label">Total ({selectedProducts.length} frascos + caja de pino)</span>
                <div className="purchase-price-row">
                  <span className="purchase-price">{cop(finalPrice)}</span>
                  <span className="purchase-free-tag">¡Caja de madera sin costo!</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-red btn-lg btn-block box-buy-btn"
              onClick={handleAddBox}
              disabled={selectedProducts.length === 0 || isAdding}
            >
              {isAdding ? '¡Agregada al carrito!' : `Agregar la Caja · ${cop(finalPrice)}`}
            </button>

            <p className="box-corp-note">
              ¿Requieres cajas corporativas o personalizadas para tu empresa?{' '}
              <a href="/contacto" className="link-btn">Contáctanos aquí</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
