'use client';
import { useEffect, useState } from 'react';
import { cop } from '@lacajita/shared';
import { useAdmin } from './AdminShell';
import { fmtDay } from './ui';

const EMPTY = { code: '', type: 'percent', value: 10, minSubtotal: 0, maxUses: null as number | null, startsAt: null as string | null, endsAt: null as string | null, active: true };
const TYPE: Record<string, string> = { percent: 'Porcentaje', fixed: 'Monto fijo', free_shipping: 'Envío gratis' };
const toInput = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const fromInput = (v: string) => (v ? new Date(v + 'T00:00:00').toISOString() : null);

export function Coupons() {
  const api = useAdmin();
  const [rows, setRows] = useState<any[] | null>(null); const [edit, setEdit] = useState<any>(null); const [msg, setMsg] = useState('');
  const load = () => api.coupons().then(setRows).catch((e: Error) => setMsg(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (c: any) => c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? cop(c.value) : 'Envío gratis';
  return (
    <>
      <div className="row-between admin-head"><h1 className="admin-h">Cupones</h1><button className="btn btn-primary" onClick={() => setEdit({ ...EMPTY })}>Nuevo cupón</button></div>
      <p className="muted">El cliente escribe el código en el paso de pago. El descuento lo valida y aplica el servidor.</p>
      {msg && <p className="notice notice-error">{msg}</p>}
      {!rows ? <p className="muted">Cargando…</p> : rows.length === 0 ? <p className="muted">Aún no hay cupones.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Código</th><th>Descuento</th><th>Mínimo</th><th className="num">Usos</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id}><td><b>{c.code}</b></td><td>{label(c)}</td><td>{c.minSubtotal ? cop(c.minSubtotal) : '—'}</td><td className="num">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td><td>{c.startsAt || c.endsAt ? `${c.startsAt ? fmtDay(c.startsAt) : '…'} → ${c.endsAt ? fmtDay(c.endsAt) : '…'}` : 'Siempre'}</td><td><span className={`badge ${c.active ? 'b-delivered' : ''}`}>{c.active ? 'Activo' : 'Inactivo'}</span></td><td><button className="link-btn" onClick={() => setEdit(c)}>Editar</button></td></tr>)}</tbody>
        </table></div>
      )}
      {edit && (
        <div className="modal-wrap" role="dialog" aria-label="Cupón">
          <div className="drawer-scrim" onClick={() => setEdit(null)} />
          <form className="modal" onSubmit={async (e) => { e.preventDefault(); setMsg(''); try { const { id, usedCount: _u, createdAt: _c, ...body } = edit; await api.saveCoupon(body, id); setEdit(null); load(); } catch (err) { setMsg((err as Error).message); } }}>
            <div className="drawer-head"><h2>{edit.id ? 'Editar cupón' : 'Nuevo cupón'}</h2><button type="button" className="icon-btn" onClick={() => setEdit(null)} aria-label="Cerrar">✕</button></div>
            <div className="fields">
              <label className="field">Código<input required value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="BIENVENIDA10" /></label>
              <label className="field">Tipo<select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              {edit.type !== 'free_shipping' && <label className="field">{edit.type === 'percent' ? 'Porcentaje' : 'Monto (COP)'}<input type="number" min={0} max={edit.type === 'percent' ? 100 : undefined} value={edit.value} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} /></label>}
              <label className="field">Compra mínima en frascos (COP)<input type="number" min={0} value={edit.minSubtotal} onChange={(e) => setEdit({ ...edit, minSubtotal: Number(e.target.value) })} /></label>
              <label className="field">Máximo de usos <span className="opt">(vacío = sin límite)</span><input type="number" min={1} value={edit.maxUses ?? ''} onChange={(e) => setEdit({ ...edit, maxUses: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className="field">Desde<input type="date" value={toInput(edit.startsAt)} onChange={(e) => setEdit({ ...edit, startsAt: fromInput(e.target.value) })} /></label>
              <label className="field">Hasta<input type="date" value={toInput(edit.endsAt)} onChange={(e) => setEdit({ ...edit, endsAt: fromInput(e.target.value) })} /></label>
              <label className="field check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Activo</label>
            </div>
            {msg && <p className="notice notice-error">{msg}</p>}
            <button className="btn btn-primary">Guardar cupón</button>
          </form>
        </div>
      )}
    </>
  );
}
