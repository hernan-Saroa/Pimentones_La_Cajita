'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cop, STATUS_LABEL, METHOD_LABEL, ORDER_STATUSES, type OrderStatus, type PaymentMethod } from '@lacajita/shared';
import { useAdmin } from './AdminShell';

const fmt = (d: string) => new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function parseGiftNote(notes?: string | null) {
  if (!notes || !notes.includes('[🎁 PEDIDO DE REGALO]')) return null;
  const paraMatch = notes.match(/Para:\s*([^\n|]+)/);
  const deMatch = notes.match(/De(?:\s*parte\s*de)?:\s*([^\n|]+)/);
  const msgMatch = notes.match(/Dedicatoria:\s*"([^"]+)"/);
  return {
    recipient: paraMatch ? paraMatch[1].trim() : '',
    sender: deMatch ? deMatch[1].trim() : '',
    message: msgMatch ? msgMatch[1].trim() : '',
  };
}

export function Orders() {
  const api = useAdmin();
  const sp = useSearchParams(); const router = useRouter();
  const status = sp.get('status') || '';
  const [q, setQ] = useState(''); const [rows, setRows] = useState<any[] | null>(null); const [sel, setSel] = useState<any>(null); const [error, setError] = useState('');
  const load = () => api.orders({ ...(status && { status }), ...(q && { q }) }).then(setRows).catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <h1 className="admin-h">Pedidos</h1>
      <div className="toolbar">
        <button className="btn btn-ghost" onClick={() => api.download('orders/export.csv', 'pedidos.csv')}>Exportar CSV</button>
        <select value={status} onChange={(e) => router.push(e.target.value ? `/admin/pedidos?status=${e.target.value}` : '/admin/pedidos')} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>{ORDER_STATUSES.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="search"><input placeholder="Referencia, nombre o correo" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-ghost">Buscar</button></form>
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      {!rows ? <p className="muted">Cargando…</p> : rows.length === 0 ? <p className="muted">No hay pedidos con ese filtro.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Pago</th><th>Estado</th><th className="num">Total</th></tr></thead>
          <tbody>{rows.map((o) => {
            const isGift = o.notes && o.notes.includes('[🎁 PEDIDO DE REGALO]');
            return (
              <tr key={o.id} className="clickable" onClick={() => api.order(o.id).then(setSel)}>
                <td>
                  <button className="link-btn">{o.reference}</button>
                  {isGift && <span className="badge-gift-pill" title="Pedido para regalo con dedicatoria">🎁 Regalo</span>}
                </td>
                <td>{fmt(o.createdAt)}</td>
                <td>{o.customerName}</td>
                <td>{o.city}</td>
                <td>{METHOD_LABEL[o.paymentMethod as PaymentMethod]}</td>
                <td><span className={`badge b-${o.status}`}>{STATUS_LABEL[o.status as OrderStatus]}</span></td>
                <td className="num">{cop(o.total)}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      {sel && <OrderDetail order={sel} onClose={() => setSel(null)} onSaved={(o) => { setSel(o); load(); }} />}
    </>
  );
}

function OrderDetail({ order, onClose, onSaved }: { order: any; onClose: () => void; onSaved: (o: any) => void }) {
  const api = useAdmin();
  const [status, setStatus] = useState<string>(order.status); const [tracking, setTracking] = useState(order.tracking || ''); const [notes, setNotes] = useState(order.adminNotes || ''); const [msg, setMsg] = useState('');
  const gift = parseGiftNote(order.notes);

  const save = async () => { setMsg(''); try { await api.updateOrder(order.id, { status, tracking, adminNotes: notes }); onSaved(await api.order(order.id)); setMsg('Pedido actualizado.'); } catch (e) { setMsg((e as Error).message); } };
  const print = () => {
    const w = window.open('', '_blank', 'width=720,height=900'); if (!w) return;
    const rows = order.items.map((i: any) => `<tr><td>${i.quantity} × ${i.name}</td><td style="text-align:right">${cop(i.unitPrice * i.quantity)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Remisión ${order.reference}</title><style>body{font-family:system-ui,sans-serif;padding:32px;max-width:640px;margin:auto;color:#111}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:6px 0;border-bottom:1px solid #ddd}.tot td{font-weight:700;border:0}.box{border:1px solid #ccc;border-radius:8px;padding:12px;margin:12px 0}small{color:#666}@media print{button{display:none}}</style></head><body>
      <h1>Pimentones La Cajita</h1><small>Remisión · pedido ${order.reference} · ${fmt(order.createdAt)}</small>
      <div class="box"><b>Entregar a</b><br>${order.customerName}<br>${order.address}<br>${order.city}, ${order.department}<br>Cel. ${order.customerPhone}${order.notes ? `<br><i>Nota del cliente: ${order.notes}</i>` : ''}</div>
      <table>${rows}<tr><td>Envío</td><td style="text-align:right">${cop(order.shipping)}</td></tr>${order.discount ? `<tr><td>Descuento ${order.couponCode || ''}</td><td style="text-align:right">−${cop(order.discount)}</td></tr>` : ''}<tr class="tot"><td>Total</td><td style="text-align:right">${cop(order.total)}</td></tr></table>
      <small>${METHOD_LABEL[order.paymentMethod as PaymentMethod]} · ${order.paymentMethod === 'cod' ? 'Cobrar al entregar' : 'Pagado / por confirmar'}. Conservar en refrigeración después de abrir.</small>
      <p><button onclick="window.print()">Imprimir</button></p></body></html>`);
    w.document.close();
  };

  const printGiftCard = () => {
    if (!gift) return;
    const w = window.open('', '_blank', 'width=600,height=750'); if (!w) return;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tarjeta de Regalo - ${order.reference}</title>
      <style>
        body { font-family: 'Georgia', serif; background: #faf6f0; color: #2a1a08; margin: 0; padding: 40px 20px; display: flex; align-items: center; justify-content: center; }
        .card { width: 440px; border: 2px solid #b91c1c; border-radius: 12px; padding: 36px 32px; background: #fffdf9; box-shadow: 0 4px 16px rgba(0,0,0,0.06); text-align: center; }
        .kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #b91c1c; font-family: system-ui, sans-serif; font-weight: 700; margin-bottom: 8px; }
        .title { font-size: 20px; margin: 0 0 20px; font-weight: normal; color: #1a1714; }
        .names { font-size: 14px; font-family: system-ui, sans-serif; margin: 16px 0; color: #555; }
        .names b { color: #111; }
        .message { font-size: 17px; line-height: 1.6; font-style: italic; margin: 24px 0; padding: 16px; background: #fdf5ea; border-radius: 8px; border-left: 3px solid #df9232; color: #221204; text-align: left; }
        .footer { font-size: 11px; color: #888; font-family: system-ui, sans-serif; margin-top: 24px; border-top: 1px dashed #ddd; padding-top: 12px; }
        @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; border: 1.5px solid #b91c1c; } button { display: none; } }
      </style></head><body>
      <div class="card">
        <div class="kicker">Pimentones La Cajita</div>
        <h2 class="title">Conservas Artesanales</h2>
        <div class="names">
          <p><b>Para:</b> ${gift.recipient || 'Alguien muy especial'}</p>
          <p><b>De:</b> ${gift.sender || 'Con todo el aprecio'}</p>
        </div>
        <div class="message">&ldquo;${gift.message || 'Que disfrutes estos sabores hechos a mano.'}&rdquo;</div>
        <div class="footer">Cosechado y elaborado en Bogotá D.C. · 100% Sin Conservantes · Pedido ${order.reference}</div>
        <p style="margin-top:20px"><button onclick="window.print()" style="padding:8px 16px; cursor:pointer; font-family:system-ui">Imprimir Tarjeta</button></p>
      </div></body></html>`);
    w.document.close();
  };

  const wa = String(order.customerPhone).replace(/\D/g, '');
  return (
    <div className="modal-wrap" role="dialog" aria-label={`Pedido ${order.reference}`}>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="modal">
        <div className="drawer-head">
          <h2>Pedido {order.reference}</h2>
          <div className="row-between" style={{ gap: '8px' }}>
            {gift && <button className="btn btn-sm btn-outline" onClick={printGiftCard}>🎁 Tarjeta de regalo</button>}
            <button className="btn btn-sm btn-ghost" onClick={print}>Imprimir remisión</button>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>
        <p className="muted small">{fmt(order.createdAt)} · {METHOD_LABEL[order.paymentMethod as PaymentMethod]}{order.wompiTransactionId ? ` · Wompi ${order.wompiTransactionId}` : ''}</p>

        {gift && (
          <div className="admin-gift-alert">
            <div className="gift-alert-header">
              <span>🎁 <strong>Pedido para Regalo</strong></span>
              <button className="btn btn-sm btn-dark" onClick={printGiftCard}>Imprimir tarjeta dedicatoria</button>
            </div>
            <div className="gift-alert-body">
              <p><b>Para:</b> {gift.recipient || 'Alguien especial'} · <b>De:</b> {gift.sender || 'Anónimo'}</p>
              {gift.message && <blockquote className="gift-alert-quote">&ldquo;{gift.message}&rdquo;</blockquote>}
            </div>
          </div>
        )}

        <div className="detail-grid">
          <div><h3>Cliente</h3><p>{order.customerName}<br />{order.customerEmail}<br /><a href={`https://wa.me/${wa.length === 10 ? '57' + wa : wa}`} target="_blank" rel="noreferrer">{order.customerPhone}</a>{order.customerDoc && <><br />Doc. {order.customerDoc}</>}</p></div>
          <div><h3>Entrega</h3><p>{order.address}<br />{order.city}, {order.department}</p>{order.notes && <p className="muted">Nota: {order.notes}</p>}</div>
        </div>
        <table className="table"><tbody>
          {order.items.map((i: any, k: number) => <tr key={k}><td>{i.quantity} × {i.name}</td><td className="num">{cop(i.unitPrice * i.quantity)}</td></tr>)}
          <tr><td>Envío{order.etaDays ? <small className="muted"> · {order.etaDays}</small> : ''}</td><td className="num">{cop(order.shipping)}</td></tr>
          {order.discount > 0 && <tr><td>Descuento {order.couponCode}</td><td className="num">−{cop(order.discount)}</td></tr>}
          <tr><td><strong>Total</strong></td><td className="num"><strong>{cop(order.total)}</strong></td></tr>
        </tbody></table>
        <div className="fields">
          <label className="field">Estado<select value={status} onChange={(e) => setStatus(e.target.value)}>{ORDER_STATUSES.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</select></label>
          <label className="field">Guía de envío<input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Transportadora y número" /></label>
          <label className="field span-2">Notas internas <span className="opt">(no las ve el cliente)</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: cliente pidió entregar después de las 6 p. m." /></label>
        </div>
        {order.status === 'pending' && status === 'cancelled' && <p className="muted small">Al cancelar un pedido pendiente, los frascos vuelven al inventario.</p>}
        {msg && <p className="notice" role="status">{msg}</p>}
        <button className="btn btn-primary" onClick={save}>Guardar cambios</button>
      </div>
    </div>
  );
}
