'use client';
import { useEffect, useState } from 'react';
import { cop, STATUS_LABEL, type OrderStatus } from '@lacajita/shared';
import { useAdmin } from './AdminShell';
import { fmtDay, fmtDate } from './ui';

export function Customers() {
  const api = useAdmin();
  const [rows, setRows] = useState<any[] | null>(null); const [q, setQ] = useState(''); const [sel, setSel] = useState<any>(null); const [hist, setHist] = useState<any[]>([]); const [error, setError] = useState('');
  const load = (s = q) => api.customers(s).then(setRows).catch((e: Error) => setError(e.message));
  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (c: any) => { setSel(c); setHist(await api.customerOrders(c.email)); };
  return (
    <>
      <div className="row-between admin-head"><h1 className="admin-h">Clientes</h1><button className="btn btn-ghost" onClick={() => api.download('customers/export.csv', 'clientes.csv')}>Exportar CSV</button></div>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); load(); }}><div className="search"><input placeholder="Nombre, correo o celular" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-ghost">Buscar</button></div></form>
      {error && <p className="notice notice-error">{error}</p>}
      {!rows ? <p className="muted">Cargando…</p> : rows.length === 0 ? <p className="muted">Aún no hay clientes.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Cliente</th><th>Ciudad</th><th className="num">Pedidos</th><th className="num">Gastado</th><th>Último pedido</th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.email} className="clickable" onClick={() => open(c)}><td><b>{c.name}</b><br /><small className="muted">{c.email} · {c.phone}</small></td><td>{c.city}</td><td className="num">{c.ordersCount}</td><td className="num">{cop(c.spent)}</td><td>{fmtDay(c.lastOrder)}</td></tr>)}</tbody>
        </table></div>
      )}
      {sel && (
        <div className="modal-wrap" role="dialog" aria-label={`Cliente ${sel.name}`}>
          <div className="drawer-scrim" onClick={() => setSel(null)} />
          <div className="modal">
            <div className="drawer-head"><h2>{sel.name}</h2><button className="icon-btn" onClick={() => setSel(null)} aria-label="Cerrar">✕</button></div>
            <p className="muted small">{sel.email} · <a href={`https://wa.me/57${String(sel.phone).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer">{sel.phone}</a> · {sel.city}</p>
            <div className="kpis compact"><div className="kpi"><span>Pedidos pagados</span><strong>{sel.ordersCount}</strong></div><div className="kpi"><span>Gastado</span><strong>{cop(sel.spent)}</strong></div><div className="kpi"><span>Cliente desde</span><strong>{fmtDay(sel.firstOrder)}</strong></div></div>
            <table className="table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th className="num">Total</th></tr></thead>
              <tbody>{hist.map((o) => <tr key={o.id}><td>{o.reference}</td><td>{fmtDate(o.createdAt)}</td><td><span className={`badge b-${o.status}`}>{STATUS_LABEL[o.status as OrderStatus]}</span></td><td className="num">{cop(o.total)}</td></tr>)}</tbody></table>
          </div>
        </div>
      )}
    </>
  );
}
