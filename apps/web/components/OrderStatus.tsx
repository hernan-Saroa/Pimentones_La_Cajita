'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cop, STATUS_LABEL, METHOD_LABEL, type PublicOrder, type StoreInfo } from '@lacajita/shared';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';
import { trackOnce } from '@/lib/track';

const STEPS = ['paid', 'preparing', 'shipped', 'delivered'] as const;

export function OrderStatus({ reference }: { reference: string }) {
  const sp = useSearchParams();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [error, setError] = useState('');
  const { clear } = useCart();

  useEffect(() => {
    let email = sp.get('email') || '';
    try { email = email || sessionStorage.getItem(`lacajita.order.${reference}`) || ''; } catch { /* */ }
    const q: { email: string; tx?: string } = { email };
    if (sp.get('id')) q.tx = sp.get('id')!;   // Wompi devuelve ?id=<transacción>
    let tries = 0; let timer: ReturnType<typeof setTimeout>;
    const load = () => api.order(reference, q).then((x) => {
      setO(x);
      if (x.status === 'pending' && x.paymentMethod === 'wompi' && tries++ < 6) timer = setTimeout(load, 3000);
    }).catch((e) => setError(e.message));
    load();
    api.store().then(setStore).catch(() => {});
    return () => clearTimeout(timer);
  }, [reference, sp]);

  useEffect(() => { if (o && (o.status === 'paid' || (o.status === 'pending' && o.paymentMethod !== 'wompi'))) trackOnce('purchase-' + o.reference, 'purchase', { value: o.total }); }, [o]);
  useEffect(() => { if (o && o.status !== 'failed' && o.status !== 'cancelled' && !(o.status === 'pending' && o.paymentMethod === 'wompi')) clear(); }, [o, clear]);

  if (error) return <section className="section narrow"><h1 className="h-page">No encontramos ese pedido</h1><p>{error}</p><Link href="/mi-pedido" className="btn btn-red btn-lg">Buscar con mi correo</Link></section>;
  if (!o) return <section className="section narrow"><p className="muted">Consultando tu pedido…</p></section>;

  const waText = encodeURIComponent(`Hola, hice el pedido ${o.reference} por ${cop(o.total)}.`);
  const stepIdx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  const awaitingManual = o.status === 'pending' && o.paymentMethod !== 'wompi';
  const closed = o.status === 'failed' || o.status === 'cancelled';

  return (
    <section className="section narrow order">
      <h1 className="h-page">
        {o.status === 'failed' ? 'El pago no se completó' : o.status === 'cancelled' ? 'Este pedido fue cancelado'
          : o.status === 'pending' && o.paymentMethod === 'wompi' ? 'Estamos confirmando tu pago' : 'Gracias, recibimos tu pedido'}
      </h1>
      {!closed && <div className="ref-card"><span>Tu número de pedido</span><b>{o.reference}</b><span>Guárdalo: con él y tu correo puedes consultar el estado cuando quieras.</span></div>}
      {o.status === 'pending' && o.paymentMethod === 'wompi' && <p className="muted">Esto toma unos segundos. No cierres la página.</p>}
      {o.status === 'failed' && <><p>El banco no aprobó el pago y <b>no se hizo ningún cobro</b>. Tus frascos siguen en el carrito: puedes intentar de nuevo o elegir otra forma de pago.</p><Link href="/pagar" className="btn btn-red btn-lg">Intentar de nuevo</Link></>}
      {awaitingManual && o.paymentMethod === 'transfer' && (
        <div className="notice next-steps"><p><b>Qué sigue:</b> {store?.transferInstructions}</p>
          {store?.whatsapp && <a className="btn btn-primary" href={`https://wa.me/${store.whatsapp}?text=${waText}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>}</div>
      )}
      {awaitingManual && o.paymentMethod === 'cod' && <p className="notice next-steps"><b>Qué sigue:</b> te escribimos al celular para confirmar la entrega. Pagas {cop(o.total)} en efectivo al recibir.</p>}
      {stepIdx >= 0 && <ol className="steps" aria-label="Estado del pedido">{STEPS.map((s, i) => <li key={s} className={i <= stepIdx ? 'done' : ''}>{STATUS_LABEL[s]}</li>)}</ol>}
      {o.tracking && <p>Número de guía: <strong>{o.tracking}</strong></p>}
      <div className="summary">
        <ul className="summary-lines plain">{o.items.map((i, k) => <li key={k}><span>{i.quantity} × {i.name}</span><span>{cop(i.unitPrice * i.quantity)}</span></li>)}</ul>
        <div className="row-between"><span>Envío a {o.city}{o.eta ? <span className="muted small"> · {o.eta}</span> : ''}</span><span>{o.shipping === 0 ? 'Gratis' : cop(o.shipping)}</span></div>
        {o.discount > 0 && <div className="row-between discount"><span>Descuento</span><span>−{cop(o.discount)}</span></div>}
        <div className="row-between total"><span>Total</span><strong>{cop(o.total)}</strong></div>
        <p className="muted small">{METHOD_LABEL[o.paymentMethod]} · {STATUS_LABEL[o.status]}</p>
      </div>
      {!closed && <Link href="/" className="btn btn-outline btn-lg">Seguir comprando</Link>}
    </section>
  );
}
