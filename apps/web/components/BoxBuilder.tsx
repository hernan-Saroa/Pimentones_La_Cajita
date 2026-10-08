'use client';
import { useState } from 'react';
import { cop, type Product } from '@lacajita/shared';
import { useCart } from '@/store/cart';
import { Sparkle } from './icons';
import { tint } from '@/lib/tints';

interface BoxBuilderProps {
  products: Product[];
  giftKicker?: string;
  giftTitle: string;
  giftText: string;
  capacity?: number;
  discountPct?: number;
  pricingMode?: 'sum' | 'fixed';
  fixedPrice?: number;
  productSlugs?: string[];
}

function CraftGuarantees() {
  return (
    <div className="box-craft-card">
      <div className="craft-item">
        <span className="craft-icon" aria-hidden="true">🌲</span>
        <div className="craft-text">
          <strong>Madera maciza de pino natural</strong>
          <span>Armada a mano en nuestro taller artesanal con acabado rústico.</span>
        </div>
      </div>
      <div className="craft-item">
        <span className="craft-icon" aria-hidden="true">🎀</span>
        <div className="craft-text">
          <strong>Lazo artesanal y dedicatoria</strong>
          <span>Tarjeta rústica kraft personalizada con tus palabras sin costo.</span>
        </div>
      </div>
      <div className="craft-item">
        <span className="craft-icon" aria-hidden="true">🛡️</span>
        <div className="craft-text">
          <strong>Protección para despachos</strong>
          <span>Cuna de viruta vegetal para que cada frasco viaje seguro a tu mesa.</span>
        </div>
      </div>
    </div>
  );
}

export function BoxBuilder({
  products,
  giftKicker = 'Edición Para Regalar',
  giftTitle,
  giftText,
  capacity = 4,
  discountPct = 0,
  pricingMode = 'sum',
  fixedPrice = 0,
  productSlugs = [],
}: BoxBuilderProps) {
  const { add, gift, setGift } = useCart();
  const allAvailable = products.filter((p) => p.stock > 0);

  // Filtrado de frascos según configuración del Backoffice
  const available = (productSlugs && productSlugs.length > 0)
    ? allAvailable.filter((p) => productSlugs.includes(p.slug))
    : allAvailable;

  const targetCapacity = Math.max(2, Math.min(12, capacity));

  // Selecciones por defecto: 1 de cada producto disponible hasta llenar la capacidad
  const [selectedItems, setSelectedItems] = useState<Product[]>(() => {
    return available.slice(0, targetCapacity);
  });

  const [ribbon, setRibbon] = useState<'rojo' | 'dorado' | 'natural'>('rojo');
  const [isAdding, setIsAdding] = useState(false);
  const [showDedication, setShowDedication] = useState(false);
  const [recipient, setRecipient] = useState(gift.recipient || '');
  const [sender, setSender] = useState(gift.sender || '');
  const [dedicationMsg, setDedicationMsg] = useState(gift.message || '');

  // Cálculo del precio según regla comercial (suma con descuento o precio fijo)
  const totalNormal = selectedItems.reduce((sum, p) => sum + p.price, 0);
  let finalPrice = totalNormal;
  if (pricingMode === 'fixed' && fixedPrice > 0) {
    finalPrice = fixedPrice;
  } else if (discountPct > 0) {
    finalPrice = Math.round(totalNormal * (1 - discountPct / 100));
  }

  const isFull = selectedItems.length >= targetCapacity;

  const addItem = (p: Product) => {
    if (selectedItems.length >= targetCapacity) return;
    setSelectedItems((prev) => [...prev, p]);
  };

  const removeItem = (p: Product) => {
    const idx = selectedItems.map((it) => it.id).lastIndexOf(p.id);
    if (idx !== -1) {
      setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const removeSlot = (slotIdx: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== slotIdx));
  };

  const setAllPresets = () => {
    setSelectedItems(available.slice(0, targetCapacity));
  };

  const clearBox = () => {
    setSelectedItems([]);
  };

  const handleAddBox = () => {
    if (selectedItems.length === 0) return;
    setIsAdding(true);

    const breakdown = available
      .map((p) => {
        const count = selectedItems.filter((it) => it.id === p.id).length;
        return count > 0 ? `${count}× ${p.name}` : null;
      })
      .filter(Boolean)
      .join(', ');

    const note = dedicationMsg.trim()
      ? `Caja artesanal con lazo ${ribbon} (${breakdown}). Dedicatoria: "${dedicationMsg.trim()}"`
      : `Caja artesanal con lazo ${ribbon} (${breakdown}).`;

    setGift({
      isGift: true,
      recipient: recipient.trim() || gift.recipient,
      sender: sender.trim() || gift.sender,
      message: note,
    });

    selectedItems.forEach((p, idx) => {
      add(p, 1, idx === selectedItems.length - 1);
    });

    setTimeout(() => setIsAdding(false), 900);
  };

  return (
    <section id="caja" className="section box-experience" aria-labelledby="box-title">
      <div className="box-experience-inner">
        {/* Encabezado superior unificado */}
        <div className="box-header-top">
          <span className="kicker-pill">{giftKicker}</span>
          <h2 id="box-title">{giftTitle}</h2>
          <p className="box-desc">{giftText}</p>
        </div>

        {/* Cuadrícula balanceada de 2 columnas con inicio alineado */}
        <div className="box-experience-grid">
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
            <div
              className="box-slots"
              style={{ gridTemplateColumns: `repeat(${targetCapacity}, minmax(0, 1fr))` }}
              aria-label="Frascos seleccionados en la caja de madera"
            >
              {[...Array(targetCapacity).keys()].map((slotIdx) => {
                const p = selectedItems[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    className={`box-slot ${p ? 'filled' : 'empty'}`}
                    onClick={() => p && removeSlot(slotIdx)}
                    title={p ? `Toca para quitar ${p.name} de la caja` : `Espacio ${slotIdx + 1} libre`}
                  >
                    {p ? (
                      <div className="slot-item" style={{ '--slot-tint': tint(p.slug) } as React.CSSProperties}>
                        <button
                          type="button"
                          className="slot-remove-badge"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlot(slotIdx);
                          }}
                          aria-label={`Quitar ${p.name}`}
                          title="Quitar de la caja"
                        >
                          ✕
                        </button>
                        <img src={p.image ?? ''} alt={p.name} loading="lazy" />
                        <span className="slot-name">{p.name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <div className="slot-placeholder">
                        <span>+ Frasco {slotIdx + 1}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tarjeta de garantías de oficio (Solo visible en Desktop en columna izquierda) */}
            <div className="craft-card-desktop">
              <CraftGuarantees />
            </div>
          </div>

          {/* Lado derecho: Configurador y Venta del Combo */}
          <div className="box-config">
            {/* Selector de sabores para la caja */}
            <div className="box-flavor-picker">
              <div className="picker-title-row">
                <div className="picker-counter-wrap">
                  <span className="picker-title">
                    Elige los frascos ({selectedItems.length}/{targetCapacity}):
                  </span>
                  {selectedItems.length === targetCapacity ? (
                    <span className="picker-ready-badge">✓ ¡Caja completa!</span>
                  ) : (
                    <span className="picker-needed-badge">Faltan {targetCapacity - selectedItems.length}</span>
                  )}
                </div>
                <div className="picker-actions-row">
                  <button type="button" className="picker-quick-btn" onClick={setAllPresets}>
                    Combo clásico
                  </button>
                  {selectedItems.length > 0 && (
                    <button type="button" className="picker-clear-btn" onClick={clearBox}>
                      Vaciar
                    </button>
                  )}
                </div>
              </div>

              {/* Lista ergonómica y táctil de frascos disponibles */}
              <div className="box-flavor-list">
                {available.map((prod) => {
                  const count = selectedItems.filter((it) => it.id === prod.id).length;
                  const isSelected = count > 0;

                  return (
                    <div
                      key={prod.id}
                      className={`box-flavor-row ${isSelected ? 'selected' : ''}`}
                      role="group"
                      aria-label={`${prod.name}: ${count} en la caja`}
                    >
                      <div
                        className="flavor-row-main"
                        onClick={() => {
                          if (!isFull) addItem(prod);
                        }}
                      >
                        <div
                          className="flavor-row-thumb"
                          style={{ '--flavor-tint': tint(prod.slug) } as React.CSSProperties}
                        >
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} loading="lazy" />
                          ) : (
                            <span className="flavor-thumb-fallback">🫙</span>
                          )}
                        </div>
                        <div className="flavor-row-text">
                          <span className="flavor-row-name">{prod.name}</span>
                          <span className="flavor-row-price">{cop(prod.price)}</span>
                        </div>
                      </div>

                      <div className="flavor-row-action">
                        {isSelected ? (
                          <div className="flavor-stepper">
                            <button
                              type="button"
                              className="flavor-stepper-btn minus"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(prod);
                              }}
                              aria-label={`Restar un ${prod.name}`}
                              title="Restar uno"
                            >
                              −
                            </button>
                            <span className="flavor-stepper-count">{count}</span>
                            <button
                              type="button"
                              className="flavor-stepper-btn plus"
                              onClick={(e) => {
                                e.stopPropagation();
                                addItem(prod);
                              }}
                              disabled={isFull}
                              aria-label={`Sumar otro ${prod.name}`}
                              title={isFull ? `La caja ya tiene ${targetCapacity} frascos` : 'Sumar otro'}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flavor-add-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(prod);
                            }}
                            disabled={isFull}
                            aria-label={`Agregar ${prod.name} a la caja`}
                          >
                            <span className="add-btn-icon">+</span>
                            <span className="add-btn-text">Agregar</span>
                          </button>
                        )}
                      </div>
                    </div>
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

            {/* Dedicatoria personalizada incluida */}
            <div className="box-dedication-box">
              <button
                type="button"
                className="box-dedication-toggle"
                onClick={() => setShowDedication(!showDedication)}
                aria-expanded={showDedication}
              >
                <span className="dedication-title">
                  <span className="dedication-icon">✉️</span>
                  <strong>¿Deseas dedicatoria en papel rústico?</strong>
                </span>
                <span className="dedication-free-tag">Incluida gratis</span>
              </button>

              {showDedication && (
                <div className="box-dedication-fields">
                  <div className="dedication-grid">
                    <label className="field-compact">
                      <span>Para quién es:</span>
                      <input
                        placeholder="Ej.: Carlos Restrepo"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                      />
                    </label>
                    <label className="field-compact">
                      <span>De parte de:</span>
                      <input
                        placeholder="Ej.: Tus amigos"
                        value={sender}
                        onChange={(e) => setSender(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="field-compact">
                    <span>Mensaje para la tarjeta:</span>
                    <textarea
                      rows={2}
                      placeholder="Ej.: ¡Feliz cumpleaños! Que disfrutes estos sabores con un buen vino."
                      value={dedicationMsg}
                      maxLength={200}
                      onChange={(e) => setDedicationMsg(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Resumen de compra de la caja */}
            <div className="box-purchase-card">
              <div className="purchase-details">
                <div className="purchase-details-col">
                  <span className="purchase-label">
                    Total ({selectedItems.length} de {targetCapacity} frascos + caja de pino)
                  </span>
                  <div className="purchase-price-row">
                    {totalNormal > finalPrice && (
                      <s className="purchase-price-old">{cop(totalNormal)}</s>
                    )}
                    <span className="purchase-price">{cop(finalPrice)}</span>
                    <span className="purchase-free-tag">
                      {discountPct > 0
                        ? `¡${discountPct}% OFF en Combo!`
                        : '¡Caja de madera sin costo!'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-red btn-lg btn-block box-buy-btn"
                onClick={handleAddBox}
                disabled={selectedItems.length !== targetCapacity || isAdding}
              >
                {isAdding
                  ? '¡Caja agregada al carrito!'
                  : selectedItems.length === targetCapacity
                  ? `Agregar la Caja de Regalo · ${cop(finalPrice)}`
                  : `Elige ${targetCapacity - selectedItems.length} frasco${targetCapacity - selectedItems.length > 1 ? 's' : ''} más para completar`}
              </button>

              <p className="box-corp-note">
                ¿Requieres cajas corporativas o personalizadas para tu empresa?{' '}
                <a href="/contacto" className="link-btn">Contáctanos aquí</a>.
              </p>
            </div>

            {/* Tarjeta de garantías de oficio (Visible en Mobile al final para no bloquear la compra) */}
            <div className="craft-card-mobile">
              <CraftGuarantees />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
