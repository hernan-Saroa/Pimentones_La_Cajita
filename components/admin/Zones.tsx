'use client';
import { useEffect, useState } from 'react';
import { cop } from '@lacajita/shared';
import { useAdmin } from './AdminShell';

/** Tarifa, días de entrega y contraentrega por departamento. Edición en la misma fila. */
export function Zones() {
  const api = useAdmin();
  const [rows, setRows] = useState<any[] | null>(null); const [msg, setMsg] = useState(''); const [saving, setSaving] = useState<number | null>(null);
  useEffect(() => { api.zones().then(setRows).catch((e: Error) => setMsg(e.message)); }, [api]);
  const set = (id: number, k: string, v: unknown) => setRows((r) => r!.map((z) => (z.id === id ? { ...z, [k]: v } : z)));
  const save = async (z: any) => { setSaving(z.id); setMsg(''); try { const { id, ...body } = z; await api.saveZone(body, id); setMsg(`Guardado: ${z.department}`); } catch (e) { setMsg((e as Error).message); } setSaving(null); };
  if (!rows) return <p className="muted">{msg || 'Cargando…'}</p>;
  return (
    <>
      <h1 className="admin-h">Zonas de envío</h1>
      <p className="muted">Lo que el cliente ve en el paso de entrega: costo, el tiempo estimado de entrega y si puede pagar al recibir. El envío gratis desde un monto se configura en Ajustes.</p>
      {msg && <p className="notice" role="status">{msg}</p>}
      <div className="table-wrap"><table className="table zones">
        <thead><tr><th>Departamento</th><th>Tarifa (COP)</th><th>Días mín.</th><th>Días máx.</th><th>Contraentrega</th><th>Activa</th><th></th></tr></thead>
        <tbody>{rows.map((z) => (
          <tr key={z.id}>
            <td><b>{z.department}</b></td>
            <td><input type="number" min={0} value={z.rate} onChange={(e) => set(z.id, 'rate', Number(e.target.value))} /></td>
            <td><input type="number" min={0} max={30} value={z.daysMin} onChange={(e) => set(z.id, 'daysMin', Number(e.target.value))} /></td>
            <td><input type="number" min={0} max={30} value={z.daysMax} onChange={(e) => set(z.id, 'daysMax', Number(e.target.value))} /></td>
            <td><input type="checkbox" checked={z.codAvailable} onChange={(e) => set(z.id, 'codAvailable', e.target.checked)} /></td>
            <td><input type="checkbox" checked={z.active} onChange={(e) => set(z.id, 'active', e.target.checked)} /></td>
            <td><button className="btn btn-sm btn-dark" disabled={saving === z.id} onClick={() => save(z)}>{saving === z.id ? '…' : 'Guardar'}</button></td>
          </tr>))}</tbody>
      </table></div>
      <p className="muted small">Tarifa actual más común: {cop(mode(rows.map((z) => z.rate)))}.</p>
    </>
  );
}
const mode = (a: number[]) => { const m = new Map<number, number>(); a.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return [...m.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? 0; };
