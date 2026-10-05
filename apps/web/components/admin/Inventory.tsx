'use client';
import { useEffect, useState } from 'react';
import { useAdmin } from './AdminShell';
import { fmtDate, fmtDay } from './ui';

const REASON: Record<string, string> = { sale: 'Venta', release: 'Devuelto al inventario', batch: 'Lote', adjust: 'Ajuste' };
const today = () => new Date().toISOString().slice(0, 10);

/** Inventario con lotes (trazabilidad y vencimiento) y ajustes con motivo. */
export function Inventory() {
  const api = useAdmin();
  const [inv, setInv] = useState<any>(null); const [sel, setSel] = useState<any>(null); const [tab, setTab] = useState<'batch' | 'adjust' | 'moves'>('batch');
  const [moves, setMoves] = useState<any[]>([]); const [batches, setBatches] = useState<any[]>([]); const [msg, setMsg] = useState('');
  const [b, setB] = useState({ code: '', quantity: 24, producedAt: today(), expiresAt: '' , note: '' });
  const [adj, setAdj] = useState({ delta: -1, note: '' });
  const load = () => api.inventory().then(setInv).catch((e: Error) => setMsg(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (p: any) => { setSel(p); setMsg(''); setTab('batch'); setMoves(await api.movements(p.id)); setBatches(await api.batches(p.id)); };
  const refresh = async () => { await load(); setMoves(await api.movements(sel.id)); setBatches(await api.batches(sel.id)); const fresh = (await api.inventory()).products.find((x: any) => x.id === sel.id); setSel(fresh); };
  if (!inv) return <p className="muted">{msg || 'Cargando…'}</p>;
  return (
    <>
      <h1 className="admin-h">Inventario</h1>
      {inv.expiringBatches.length > 0 && <p className="notice"><b>Lotes que vencen en los próximos 30 días:</b> {inv.expiringBatches.map((x: any) => `${x.code} (${fmtDay(x.expiresAt)})`).join(', ')}</p>}
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Producto</th><th className="num">En inventario</th><th className="num">Vendidos 30 días</th><th className="num">Días de inventario</th><th></th></tr></thead>
        <tbody>{inv.products.map((p: any) => <tr key={p.id} className={!p.active ? 'muted' : ''}><td><b>{p.name}</b>{!p.active && <small className="muted"> · oculto</small>}</td><td className={`num ${p.stock <= 5 ? 'warn' : ''}`}>{p.stock}</td><td className="num">{p.sold30d}</td><td className="num">{p.daysOfStock == null ? '—' : p.daysOfStock <= 7 ? <span className="warn">{p.daysOfStock}</span> : p.daysOfStock}</td><td><button className="link-btn" onClick={() => open(p)}>Gestionar</button></td></tr>)}</tbody>
      </table></div>
      <p className="muted small">Días de inventario estima cuánto dura el stock al ritmo de venta de los últimos 30 días.</p>
      {sel && (
        <div className="modal-wrap" role="dialog" aria-label={sel.name}>
          <div className="drawer-scrim" onClick={() => setSel(null)} />
          <div className="modal">
            <div className="drawer-head"><h2>{sel.name} · {sel.stock} en inventario</h2><button className="icon-btn" onClick={() => setSel(null)} aria-label="Cerrar">✕</button></div>
            <div className="seg" role="tablist">{(['batch', 'adjust', 'moves'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{{ batch: 'Nuevo lote', adjust: 'Ajuste', moves: 'Historial' }[t]}</button>)}</div>
            {tab === 'batch' && (
              <form className="fields" onSubmit={async (e) => { e.preventDefault(); setMsg(''); try { await api.addBatch({ productId: sel.id, code: b.code, quantity: b.quantity, producedAt: new Date(b.producedAt + 'T00:00:00').toISOString(), expiresAt: b.expiresAt ? new Date(b.expiresAt + 'T00:00:00').toISOString() : null, note: b.note }); setMsg(`Lote ${b.code} agregado: +${b.quantity}.`); setB({ ...b, code: '' }); await refresh(); } catch (err) { setMsg((err as Error).message); } }}>
                <label className="field">Código del lote<input required value={b.code} onChange={(e) => setB({ ...b, code: e.target.value })} placeholder="L-2026-10-A" /></label>
                <label className="field">Frascos<input type="number" min={1} required value={b.quantity} onChange={(e) => setB({ ...b, quantity: Number(e.target.value) })} /></label>
                <label className="field">Fecha de producción<input type="date" required value={b.producedAt} onChange={(e) => setB({ ...b, producedAt: e.target.value })} /></label>
                <label className="field">Consumir antes de <span className="opt">(opcional)</span><input type="date" value={b.expiresAt} onChange={(e) => setB({ ...b, expiresAt: e.target.value })} /></label>
                <label className="field span-2">Nota<input value={b.note} onChange={(e) => setB({ ...b, note: e.target.value })} placeholder="Proveedor del pimentón, observaciones" /></label>
                {msg && <p className="notice span-2" role="status">{msg}</p>}
                <button className="btn btn-primary">Agregar lote al inventario</button>
              </form>
            )}
            {tab === 'adjust' && (
              <form className="fields" onSubmit={async (e) => { e.preventDefault(); setMsg(''); try { const r = await api.adjustStock({ productId: sel.id, delta: adj.delta, note: adj.note }); setMsg(`Inventario ahora: ${r.stock}.`); setAdj({ delta: -1, note: '' }); await refresh(); } catch (err) { setMsg((err as Error).message); } }}>
                <label className="field">Cantidad (negativa para restar)<input type="number" required value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: Number(e.target.value) })} /></label>
                <label className="field">Motivo<input required minLength={3} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="Frascos rotos, muestras, conteo físico" /></label>
                {msg && <p className="notice span-2" role="status">{msg}</p>}
                <button className="btn btn-primary">Aplicar ajuste</button>
              </form>
            )}
            {tab === 'moves' && (
              <>
                {batches.length > 0 && <><h3>Lotes</h3><table className="table"><thead><tr><th>Lote</th><th className="num">Frascos</th><th>Producido</th><th>Vence</th></tr></thead><tbody>{batches.map((x) => <tr key={x.id}><td>{x.code}</td><td className="num">{x.quantity}</td><td>{fmtDay(x.producedAt)}</td><td>{x.expiresAt ? fmtDay(x.expiresAt) : '—'}</td></tr>)}</tbody></table></>}
                <h3>Movimientos</h3>
                {moves.length === 0 ? <p className="muted">Sin movimientos registrados.</p> : <table className="table"><tbody>{moves.map((m) => <tr key={m.id}><td>{fmtDate(m.createdAt)}</td><td>{REASON[m.reason] ?? m.reason}{m.note ? <small className="muted"> · {m.note}</small> : ''}</td><td className={`num ${m.delta < 0 ? 'warn' : ''}`}>{m.delta > 0 ? '+' : ''}{m.delta}</td><td><small className="muted">{m.actor}</small></td></tr>)}</tbody></table>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
