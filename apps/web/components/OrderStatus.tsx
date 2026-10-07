'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cop, STATUS_LABEL, METHOD_LABEL, type PublicOrder, type StoreInfo } from '@lacajita/shared';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';
import { trackOnce } from '@/lib/track';

import { saveOrderToHistory } from '@/lib/customerStorage';

const STEPS = ['paid', 'preparing', 'shipped', 'delivered'] as const;

export function OrderStatus({ reference }: { reference: string }) {
  const sp = useSearchParams();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [error, setError] = useState('');
  const { clear } = useCart();

  useEffect(() => {
    let email = sp.get('email') || '';
    try {
      email = email || sessionStorage.getItem(`lacajita.order.${reference}`) || '';
      // Si no viene en sessionStorage, intentar desde localStorage de pedidos recientes
      if (!email) {
        const savedRef = localStorage.getItem('lacajita_recent_ref');
        if (savedRef === reference) {
          email = localStorage.getItem('lacajita_recent_email') || '';
        }
      }
    } catch {
      /* */
    }

    const q: { email: string; tx?: string } = { email };
    if (sp.get('id')) q.tx = sp.get('id')!; // Wompi devuelve ?id=<transacción>

    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const load = () =>
      api
        .order(reference, q)
        .then((x) => {
          setO(x);
          // Actualizar / guardar en historial local para consulta en 1 clic
          saveOrderToHistory({
            reference: x.reference,
            email: email || '',
            date: x.createdAt || new Date().toISOString(),
            total: x.total,
            itemCount: x.items?.reduce((acc, it) => acc + it.quantity, 0),
            itemsSummary: x.items?.map((it) => `${it.quantity}x ${it.name}`).join(', '),
            status: x.status,
            city: x.city,
          });

          if (x.status === 'pending' && x.paymentMethod === 'wompi' && tries++ < 6) {
            timer = setTimeout(load, 3000);
          }
        })
        .catch((e) => setError(e.message));

    load();
    api.store().then(setStore).catch(() => {});
    return () => clearTimeout(timer);
  }, [reference, sp]);

  useEffect(() => {
    if (o && (o.status === 'paid' || (o.status === 'pending' && o.paymentMethod !== 'wompi'))) {
      trackOnce('purchase-' + o.reference, 'purchase', { value: o.total });
    }
  }, [o]);

  useEffect(() => {
    if (o && o.status !== 'failed' && o.status !== 'cancelled' && !(o.status === 'pending' && o.paymentMethod === 'wompi')) {
      clear();
    }
  }, [o, clear]);

  // Pantalla de error con recuperación intuitiva
  if (error) {
    return (
      <section className="track-section">
        <div className="track-container">
          <div className="track-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
            <h1 className="track-title" style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>
              No pudimos encontrar ese pedido
            </h1>
            <p className="track-subtitle" style={{ margin: '0 auto 1.8rem', fontSize: '0.95rem' }}>
              {error.includes('datos')
                ? 'El número de pedido o el correo electrónico no coinciden con nuestros registros del fogón.'
                : error}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/mi-pedido" className="track-submit-btn" style={{ width: 'auto', padding: '0 1.8rem' }}>
                Intentar con otro correo o número
              </Link>
              <a
                href="https://wa.me/573103347621?text=Hola%20taller%20La%20Cajita,%20necesito%20ayuda%20para%20rastrear%20mi%20pedido."
                target="_blank"
                rel="noreferrer"
                className="track-wa-link"
                style={{ padding: '0.85rem 1.4rem' }}
              >
                Escribir a soporte por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Estado de Carga World-Class con Skeleton y Feedback Visual Continuo
  if (!o) {
    return (
      <section className="track-section">
        <div className="track-container">
          <div className="track-header">
            <span className="track-badge">✦ Conectando con el taller</span>
            <h1 className="track-title">Consultando tu pedido…</h1>
            <p className="track-subtitle">Buscando los datos de cocción y despacho para la referencia #{reference}</p>
          </div>

          <div className="track-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fff8f6', borderRadius: '14px', border: '1px solid rgba(186, 30, 35, 0.15)' }}>
              <span className="track-spinner" style={{ borderTopColor: '#ba1e23', borderColor: 'rgba(186, 30, 35, 0.2)' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ba1e23' }}>Verificando en tiempo real con el fogón...</span>
            </div>

            {/* Stepper simulado en carga */}
            <ol className="steps" style={{ opacity: 0.5 }}>
              {STEPS.map((s) => (
                <li key={s}>{STATUS_LABEL[s]}</li>
              ))}
            </ol>

            <div style={{ height: '80px', background: '#f5f2eb', borderRadius: '16px', animation: 'waPulse 1.8s infinite' }} />
            <div style={{ height: '120px', background: '#f5f2eb', borderRadius: '16px', animation: 'waPulse 1.8s infinite' }} />
          </div>
        </div>
      </section>
    );
  }

  const waText = encodeURIComponent(`Hola taller La Cajita, tengo una consulta sobre mi pedido ${o.reference}.`);
  const stepIdx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  const awaitingManual = o.status === 'pending' && o.paymentMethod !== 'wompi';
  const closed = o.status === 'failed' || o.status === 'cancelled';

  // Badge contextual según estado
  const statusInfo = {
    paid: { tone: 'green', label: '✅ Pago Confirmado · En fila de fogón' },
    preparing: { tone: 'amber', label: '🔥 En el Fogón · Cocinando y empacando tu tanda' },
    shipped: { tone: 'blue', label: '🚚 En Camino · Con transportadora nacional' },
    delivered: { tone: 'emerald', label: '✨ Entregado · En tu mesa' },
    pending: { tone: 'amber', label: '⏳ Pago Pendiente' },
    refunded: { tone: 'purple', label: '↩️ Pedido Reembolsado' },
    failed: { tone: 'red', label: '❌ Pago Rechazado' },
    cancelled: { tone: 'red', label: '⛔ Pedido Cancelado' },
  }[o.status] || { tone: 'gray', label: STATUS_LABEL[o.status] || o.status };

  return (
    <section className="track-section">
      <div className="track-container" style={{ maxWidth: '720px' }}>
        <div className="track-header">
          <span className="track-badge">Rastreo Oficial en Vivo</span>
          <h1 className="track-title">
            {o.status === 'failed'
              ? 'El pago no se completó'
              : o.status === 'cancelled'
              ? 'Este pedido fue cancelado'
              : o.status === 'pending' && o.paymentMethod === 'wompi'
              ? 'Confirmando tu transacción...'
              : 'Estado de tu Pedido'}
          </h1>
          <p className="track-subtitle">
            {statusInfo.label}
          </p>
        </div>

        {/* Tarjeta Principal de Seguimiento */}
        <div className="track-card">
          {/* Referencia destacada */}
          {!closed && (
            <div className="ref-card" style={{ margin: '0 0 1.5rem', background: '#fdfaf6', border: '1px solid #ede3d6', borderRadius: '20px', padding: '1.2rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c827a', fontWeight: 700, display: 'block' }}>
                    Referencia de compra
                  </span>
                  <b style={{ fontSize: '1.7rem', color: '#181412', letterSpacing: '0.02em', display: 'block', marginTop: '2px' }}>
                    {o.reference}
                  </b>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', padding: '6px 14px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 750 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  {STATUS_LABEL[o.status]}
                </div>
              </div>
            </div>
          )}

          {/* Stepper Visual de 4 Fases */}
          {stepIdx >= 0 && (
            <ol className="steps" aria-label="Línea de tiempo del pedido">
              {STEPS.map((s, i) => {
                const isDone = i <= stepIdx;
                const isActive = i === stepIdx;
                return (
                  <li key={s} className={`${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                    <span>{STATUS_LABEL[s]}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Despacho y Guía de Transporte */}
          {o.tracking && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '1.2rem', margin: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#166534', fontWeight: 700, display: 'block' }}>
                  Guía de Transporte Asignada
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#14532d', display: 'block', marginTop: '2px' }}>
                  {o.tracking}
                </strong>
                {o.eta && (
                  <span style={{ fontSize: '0.82rem', color: '#15803d', display: 'block', marginTop: '3px' }}>
                    🚚 Tiempo estimado de llegada: {o.eta}
                  </span>
                )}
              </div>
              <a
                href={`https://www.google.com/search?q=rastreo+guia+${encodeURIComponent(o.tracking)}`}
                target="_blank"
                rel="noreferrer"
                className="track-recent-btn"
                style={{ background: '#15803d', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
              >
                Rastrear en transportadora →
              </a>
            </div>
          )}

          {/* Instrucciones de Pago Manual */}
          {awaitingManual && o.paymentMethod === 'transfer' && (
            <div className="notice next-steps" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '1.2rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#92400e' }}>
                <b>Siguiente paso para preparar tu caja:</b> {store?.transferInstructions || 'Realiza la transferencia y envíanos el comprobante.'}
              </p>
              {store?.whatsapp && (
                <a
                  className="btn btn-primary"
                  style={{ marginTop: '0.8rem', display: 'inline-flex' }}
                  href={`https://wa.me/${store.whatsapp}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar comprobante por WhatsApp →
                </a>
              )}
            </div>
          )}

          {awaitingManual && o.paymentMethod === 'cod' && (
            <div className="notice next-steps" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '1.2rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e40af' }}>
                <b>Pago contraentrega:</b> Te contactaremos al celular para coordinar la entrega. Pagas <b>{cop(o.total)}</b> en efectivo al recibir tu caja.
              </p>
            </div>
          )}

          {/* Desglose de Frascos y Totales */}
          <div className="summary" style={{ marginTop: '1.8rem', borderTop: '1px solid #f0eae1', paddingTop: '1.4rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 750, color: '#181412', marginBottom: '0.8rem' }}>
              Frascos en este pedido
            </h3>
            <ul className="summary-lines plain" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: 0, margin: '0 0 1rem', listStyle: 'none' }}>
              {o.items.map((i, k) => (
                <li key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span>
                    <b>{i.quantity}×</b> {i.name}
                  </span>
                  <span style={{ fontWeight: 600 }}>{cop(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="row-between" style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.9rem', padding: '0.4rem 0' }}>
              <span>
                Envío a {o.city} {o.eta ? <span style={{ color: '#888' }}>({o.eta})</span> : ''}
              </span>
              <span>{o.shipping === 0 ? 'Gratis' : cop(o.shipping)}</span>
            </div>

            {o.discount > 0 && (
              <div className="row-between discount" style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontSize: '0.9rem', padding: '0.4rem 0' }}>
                <span>Descuento aplicado</span>
                <span>−{cop(o.discount)}</span>
              </div>
            )}

            <div className="row-between total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#181412', borderTop: '1px solid #f0eae1', paddingTop: '0.8rem', marginTop: '0.6rem' }}>
              <span>Total pagado</span>
              <strong>{cop(o.total)}</strong>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#8c827a', marginTop: '0.6rem' }}>
              Método: {METHOD_LABEL[o.paymentMethod]} · Estado: {STATUS_LABEL[o.status]}
            </p>
          </div>

          {/* Acciones Finales */}
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link href="/" className="btn btn-outline btn-lg" style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}>
              Seguir explorando la tienda
            </Link>
            <Link href="/mi-pedido" className="btn btn-lg" style={{ background: '#f5f2eb', color: '#181412', border: '1px solid #e5ded7', flex: 1, minWidth: '180px', justifyContent: 'center' }}>
              Consultar otro pedido
            </Link>
          </div>
        </div>

        {/* Asistencia Directa */}
        <div className="track-help-card">
          <div className="track-help-text">
            <strong>¿Tienes alguna duda sobre tu entrega?</strong>
            <p>Escríbenos directamente a WhatsApp con tu referencia {o.reference} y te respondemos en segundos.</p>
          </div>
          <a
            href={`https://wa.me/573103347621?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="track-wa-link"
          >
            <span>Hablar por WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
