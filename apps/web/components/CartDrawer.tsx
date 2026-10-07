'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cop, type Product, type SiteContent } from '@lacajita/shared';
import { api } from '@/lib/api';
import { tint } from '@/lib/tints';
import { useCart, cartTotals } from '@/store/cart';
import { Close, Plus, Minus, Sparkle } from './icons';

export function CartDrawer() {
  const { lines, setQty, remove, open, setOpen, add, gift, setGift } = useCart();
  const { subtotal } = cartTotals(lines);
  const [freeFrom, setFreeFrom] = useState(0);
  const [wa, setWa] = useState('');
  const [content, setContent] = useState<SiteContent | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showGiftForm, setShowGiftForm] = useState(gift.isGift);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (gift.isGift) setShowGiftForm(true);
  }, [gift.isGift]);

  useEffect(() => {
    api.store().then((s) => { setFreeFrom(s.shipping.freeFrom); setWa(s.whatsapp); }).catch(() => {});
    api.content().then(setContent).catch(() => {});
    api.products().then(setAllProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, setOpen]);

  const missing = Math.max(0, freeFrom - subtotal);
  const pct = freeFrom ? Math.min(100, (subtotal / freeFrom) * 100) : 0;
  const isFreeUnlocked = freeFrom > 0 && subtotal >= freeFrom;

  // Configuración del Carrito desde el Admin
  const cartTitle = content?.cartTitle || 'Carrito';
  const showShipBar = (content?.cartFreeShippingBarEnabled ?? true) && freeFrom > 0;
  const shipUnlockedText = content?.cartFreeShippingText || '¡Felicitaciones! Tienes Envío Gratis';

  const showUpsell = content?.cartUpsellEnabled ?? true;
  const upsellTitle = content?.cartUpsellTitle || 'Completa tu mesa';
  const targetUpsellSlug = content?.cartUpsellProductSlug;
  const customUpsellProduct = targetUpsellSlug && targetUpsellSlug !== 'auto'
    ? allProducts.find((p) => p.slug === targetUpsellSlug && p.stock > 0 && !lines.some((l) => l.id === p.id))
    : null;
  const upsellCandidates = allProducts.filter((p) => p.stock > 0 && !lines.some((l) => l.id === p.id));
  const upsell = customUpsellProduct || upsellCandidates[0] || null;

  const showGift = content?.cartGiftEnabled ?? true;
  const giftTitle = content?.cartGiftTitle || '¿Es un regalo? Dedicatoria artesanal';
  const giftBadge = content?.cartGiftBadge || 'Sin costo';
  const giftNote = content?.cartGiftNote || 'Incluimos una tarjeta con dedicatoria en papel rústico dentro de tu pedido.';

  const shippingNote = content?.cartShippingNote || 'Envío calculado en el siguiente paso según tu ciudad.';
  const checkoutBtnText = content?.cartCheckoutBtnText || 'Continuar al Pago';
  const showWa = (content?.cartWhatsAppEnabled ?? true) && Boolean(wa);
  const waBtnText = content?.cartWhatsAppBtnText || 'Prefiero pedir por WhatsApp';
  const guaranteeText = content?.cartGuaranteeText || '🌿 100% Sin Conservantes · 🚚 Despachos a toda Colombia';

  const waText = encodeURIComponent(`Hola La Cajita, quiero pedir:\n${lines.map((l) => `• ${l.qty} × ${l.name}`).join('\n')}\nSubtotal: ${cop(subtotal)}${gift.isGift && gift.message ? `\n🎁 Regalo para ${gift.recipient || 'alguien especial'}: "${gift.message}"` : ''}`);

  return (
    <div className={`drawer-wrap ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={() => setOpen(false)} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Carrito de compras" tabIndex={-1} ref={ref}>
        <div className="drawer-head">
          <div className="drawer-head-title">
            <h2>{cartTitle}</h2>
            {lines.length > 0 && <span className="drawer-count-badge">{lines.reduce((s, l) => s + l.qty, 0)} frascos</span>}
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar carrito"><Close /></button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer-empty">
            <span className="drawer-empty-icon">🫙</span>
            <p>Tu carrito está vacío.</p>
            <span className="drawer-empty-desc">Nuestros lotes se agotan rápido. Elige tus sabores artesanales favoritos.</span>
            <Link href="/#tienda" className="btn btn-red btn-lg" onClick={() => setOpen(false)}>Ver la tienda</Link>
          </div>
        ) : (
          <>
            {showShipBar && (
              <div className={`ship-progress ${isFreeUnlocked ? 'is-unlocked' : ''}`}>
                <div className="ship-progress-text">
                  {missing > 0 ? (
                    <>Te faltan <b>{cop(missing)}</b> para <strong>Envío Gratis</strong></>
                  ) : (
                    <span className="ship-unlocked-tag">🎉 {shipUnlockedText}</span>
                  )}
                </div>
                <div className="bar"><span style={{ width: `${pct}%` }} /></div>
              </div>
            )}

            <div className="drawer-scroll-area">
              {gift.isGift && (
                <div className="cart-combo-badge-banner">
                  <span className="combo-banner-icon">🎁</span>
                  <div className="combo-banner-text">
                    <strong>Caja de Regalo Artesanal Incluida</strong>
                    <span>{gift.message ? gift.message.split('.')[0] : 'Empaque en madera de pino y lazo artesanal incluidos sin costo.'}</span>
                  </div>
                </div>
              )}

              <ul className="lines">
                {lines.map((l) => (
                  <li key={l.id} className="line">
                    <span className="line-img" style={{ '--tint': tint(l.slug) } as React.CSSProperties}>
                      <img src={l.image ?? ''} alt="" />
                    </span>
                    <div className="line-info">
                      <p className="line-name">{l.name}</p>
                      <p className="line-price">{cop(l.price)}</p>
                      <div className="stepper btn-sm" role="group" aria-label={`Cantidad de ${l.name}`}>
                        <button onClick={() => setQty(l.id, l.qty - 1)} aria-label="Quitar uno"><Minus width={14} height={14} /></button>
                        <span aria-live="polite">{l.qty}</span>
                        <button onClick={() => setQty(l.id, l.qty + 1)} disabled={l.qty >= l.stock} aria-label="Agregar uno"><Plus width={14} height={14} /></button>
                      </div>
                    </div>
                    <div className="line-end">
                      <p className="line-total">{cop(l.price * l.qty)}</p>
                      <button className="line-remove" onClick={() => remove(l.id)}>Quitar</button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 1-Click Upsell inteligente: agrega el sabor que le falta a la mesa */}
              {showUpsell && upsell && (
                <div className="cart-upsell-card">
                  <div className="upsell-badge">
                    <Sparkle width={12} height={12} />
                    <span>{upsellTitle}</span>
                  </div>
                  <div className="upsell-body">
                    <div className="upsell-img" style={{ '--tint': tint(upsell.slug) } as React.CSSProperties}>
                      <img src={upsell.image ?? ''} alt={upsell.name} />
                    </div>
                    <div className="upsell-info">
                      <p className="upsell-name">{upsell.name}</p>
                      <p className="upsell-price">{cop(upsell.price)}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-dark upsell-btn"
                      onClick={() => add(upsell, 1, false)}
                    >
                      + Añadir
                    </button>
                  </div>
                </div>
              )}

              {/* Dedicatoria de Regalo Artesanal */}
              {showGift && (
                <div className="cart-gift-box">
                  <button
                    type="button"
                    className="gift-toggle-btn"
                    onClick={() => {
                      const next = !showGiftForm;
                      setShowGiftForm(next);
                      setGift({ isGift: next });
                    }}
                    aria-expanded={showGiftForm}
                  >
                    <span className="gift-toggle-title">
                      <span className="gift-emoji">🎁</span>
                      <span>{giftTitle}</span>
                    </span>
                    {giftBadge && <span className="gift-free-chip">{giftBadge}</span>}
                  </button>

                  {showGiftForm && (
                    <div className="gift-fields">
                      <p className="gift-note-tip">
                        {giftNote}
                      </p>
                      <div className="gift-inputs-grid">
                        <label className="field-compact">
                          <span>Para quien es:</span>
                          <input
                            placeholder="Ej.: Camila Restrepo"
                            value={gift.recipient}
                            onChange={(e) => setGift({ recipient: e.target.value })}
                          />
                        </label>
                        <label className="field-compact">
                          <span>De parte de:</span>
                          <input
                            placeholder="Ej.: Tu familia"
                            value={gift.sender}
                            onChange={(e) => setGift({ sender: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="field-compact">
                        <span>Mensaje especial:</span>
                        <textarea
                          rows={2}
                          placeholder="Ej.: ¡Feliz cumpleaños! Que disfrutes estos sabores con un buen vino."
                          value={gift.message}
                          maxLength={250}
                          onChange={(e) => setGift({ message: e.target.value })}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="drawer-foot">
              <div className="row-between">
                <span>Subtotal</span>
                <strong className="drawer-subtotal-val">{cop(subtotal)}</strong>
              </div>
              <p className="muted small drawer-ship-note">
                {shippingNote}
              </p>
              <Link href="/pagar" className="btn btn-red btn-lg btn-block drawer-pay-btn" onClick={() => setOpen(false)}>
                {checkoutBtnText} · {cop(subtotal)}
              </Link>
              {showWa && (
                <a className="btn btn-outline btn-block wa-btn" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${waText}`}>
                  {waBtnText}
                </a>
              )}
              {guaranteeText && (
                <div className="drawer-guarantee">
                  <span>{guaranteeText}</span>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
