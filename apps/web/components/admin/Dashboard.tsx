'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cop, STATUS_LABEL, METHOD_LABEL, type OrderStatus, type PaymentMethod } from '@lacajita/shared';
import { useAdmin } from './AdminShell';
import { Kpi, BarChart, Distribution } from './ui';

export function Dashboard() {
  const api = useAdmin();
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null); const [f, setF] = useState<any>(null); const [unread, setUnread] = useState(0); const [error, setError] = useState('');
  useEffect(() => { setD(null); api.analytics(days).then(setD).catch((e: Error) => setError(e.message)); api.funnel(days).then(setF).catch(() => setF(null)); api.messages('new').then((m: any[]) => setUnread(m.length)).catch(() => {}); }, [api, days]);
  if (error) return <p className="notice notice-error">{error}</p>;
  if (!d) return <p className="muted">Cargando tablero…</p>;
  const k = d.kpis;
  return (
    <>
      <div className="row-between admin-head">
        <h1 className="admin-h">Tablero</h1>
        <div className="seg" role="tablist">{[7, 30, 90].map((n) => <button key={n} role="tab" aria-selected={days === n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n} días</button>)}</div>
      </div>
      <div className="kpis">
        <Kpi label="Ventas pagadas" value={k.sales.value} change={k.sales.change} money />
        <Kpi label="Pedidos pagados" value={k.orders.value} change={k.orders.change} />
        <Kpi label="Ticket promedio" value={k.aov.value} change={k.aov.change} money />
        <Kpi label="Frascos vendidos" value={k.units.value} hint="unidades" />
        <Kpi label="Clientes nuevos" value={k.newCustomers.value} hint={`${k.newCustomers.repeat} recurrentes`} />
        <Kpi label="Descuentos otorgados" value={k.discounts.value} hint="en cupones" money />
      </div>
      <div className="ops-row">
        <Link href="/admin/pedidos?status=paid" className="ops-chip"><b>{d.ops.toShip}</b> por despachar</Link>
        <Link href="/admin/pedidos?status=pending" className="ops-chip"><b>{d.ops.pendingConfirmation}</b> por confirmar pago</Link>
        <Link href="/admin/inventario" className={`ops-chip ${d.lowStock.length ? 'warn' : ''}`}><b>{d.lowStock.length}</b> con inventario bajo</Link>
        <span className="ops-chip"><b>{d.ops.subscribers}</b> suscriptores</span>
        <Link href="/admin/mensajes?status=new" className={`ops-chip ${unread ? 'warn' : ''}`}><b>{unread}</b> mensajes sin leer</Link>
      </div>
      <div className="admin-cols">
        <section className="panel"><h2>Ventas por día</h2><BarChart data={d.daily.map((x: any) => ({ label: x.day.slice(5), value: x.sales }))} money /></section>
        {f && (
          <section className="panel"><h2>Embudo de conversión</h2>
            <p className="muted small">Sesiones de la tienda en el periodo. Conversión visita → compra: <b>{f.conversion}%</b>. Carritos abandonados en el pago: <b>{f.abandoned}</b>.</p>
            <Distribution rows={f.steps.map((st: any) => ({ label: st.label, value: st.sessions }))} />
            {f.assistantQueries > 0 && <p className="muted small">{f.assistantQueries} consultas al asistente ¿Qué vas a cocinar?.</p>}
          </section>
        )}
        <section className="panel"><h2>Estados de pedidos</h2>
          <Distribution rows={['pending', 'paid', 'preparing', 'shipped', 'delivered', 'failed', 'cancelled'].map((s) => ({ label: STATUS_LABEL[s as OrderStatus], value: d.byStatus.find((x: any) => x.status === s)?.n ?? 0 })).filter((r) => r.value > 0)} /></section>
        <section className="panel"><h2>Más vendidos</h2>
          {d.topProducts.length === 0 ? <p className="muted">Sin ventas pagadas en el periodo.</p> : <table className="table"><tbody>{d.topProducts.map((t: any) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.units} u.</td><td className="num">{cop(t.sales)}</td></tr>)}</tbody></table>}</section>
        <section className="panel"><h2>Medios de pago</h2><Distribution rows={d.byMethod.map((m: any) => ({ label: METHOD_LABEL[m.method as PaymentMethod], value: m.sales }))} money /></section>
        <section className="panel"><h2>Ciudades</h2>
          {d.byCity.length === 0 ? <p className="muted">Sin datos.</p> : <table className="table"><tbody>{d.byCity.map((c: any) => <tr key={c.city + c.department}><td>{c.city}<small className="muted"> · {c.department}</small></td><td className="num">{c.n} ped.</td><td className="num">{cop(c.sales)}</td></tr>)}</tbody></table>}</section>
        <section className="panel"><h2>Inventario bajo</h2>
          {d.lowStock.length === 0 ? <p className="muted">Todos los productos tienen más de 5 frascos.</p> : <table className="table"><tbody>{d.lowStock.map((p: any) => <tr key={p.id}><td>{p.name}</td><td className="num warn">{p.stock}</td></tr>)}</tbody></table>}
          <Link href="/admin/inventario">Ir a inventario</Link></section>
      </div>
    </>
  );
}
