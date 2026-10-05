'use client';
import { useEffect, useState } from 'react';
import { cop } from '@lacajita/shared';
import { useAdmin } from './AdminShell';

const EMPTY = { slug: '', name: '', kicker: '', tagline: '', description: '', pairing: '', price: 0, sizeG: 200, stock: 0, image: '', active: true, sort: 0 };
type P = typeof EMPTY & { id?: number };

export function Products() {
  const api = useAdmin();
  const [rows, setRows] = useState<P[] | null>(null); const [edit, setEdit] = useState<P | null>(null); const [error, setError] = useState('');
  const load = () => api.products().then(setRows).catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="row-between"><h1 className="admin-h">Productos</h1><button className="btn btn-primary" onClick={() => setEdit({ ...EMPTY })}>Nuevo producto</button></div>
      {error && <p className="notice notice-error">{error}</p>}
      {!rows ? <p className="muted">Cargando…</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th></th><th>Producto</th><th className="num">Precio</th><th className="num">Inventario</th><th>Visible</th><th></th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id}><td><img className="thumb" src={p.image} alt="" /></td><td>{p.name}</td><td className="num">{cop(p.price)}</td><td className={`num ${p.stock <= 5 ? 'warn' : ''}`}>{p.stock}</td><td>{p.active ? 'Sí' : 'No'}</td><td><button className="link-btn" onClick={() => setEdit(p)}>Editar</button></td></tr>)}</tbody>
        </table></div>
      )}
      {edit && <ProductForm product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}

function ProductForm({ product, onClose, onSaved }: { product: P; onClose: () => void; onSaved: () => void }) {
  const api = useAdmin();
  const [p, setP] = useState<P>(product); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof P, num = false) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: num ? Number(e.target.value) : e.target.value });
  const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <div className="modal-wrap" role="dialog" aria-label="Editar producto">
      <div className="drawer-scrim" onClick={onClose} />
      <form className="modal" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(''); try { await api.saveProduct(p as any); onSaved(); } catch (err) { setMsg((err as Error).message); setBusy(false); } }}>
        <div className="drawer-head"><h2>{p.id ? 'Editar producto' : 'Nuevo producto'}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button></div>
        <div className="fields">
          <label className="field span-2">Nombre<input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value, slug: p.id ? p.slug : slugify(e.target.value) })} /></label>
          <label className="field">Dirección web (slug)<input required value={p.slug} onChange={set('slug')} pattern="[a-z0-9-]{3,80}" /></label>
          <label className="field">Orden en la tienda<input type="number" value={p.sort} onChange={set('sort', true)} /></label>
          <label className="field">Precio (COP)<input type="number" min={0} required value={p.price} onChange={set('price', true)} /></label>
          <label className="field">Inventario (frascos)<input type="number" min={0} required value={p.stock} onChange={set('stock', true)} /></label>
          <label className="field">Contenido (g)<input type="number" min={0} value={p.sizeG} onChange={set('sizeG', true)} /></label>
          <label className="field check"><input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} /> Visible en la tienda</label>
          <label className="field">Frase sobre el nombre<input value={p.kicker || ''} onChange={set('kicker')} maxLength={60} placeholder="La consentida" /></label>
          <label className="field">Frase corta<input value={p.tagline || ''} onChange={set('tagline')} maxLength={200} /></label>
          <label className="field span-2">Descripción<textarea required rows={5} value={p.description} onChange={set('description')} /></label>
          <label className="field span-2">Va con<input value={p.pairing || ''} onChange={set('pairing')} placeholder="Quesos, carnes frías…" /></label>
          <div className="field span-2">Foto
            <div className="upload">{p.image && <img className="thumb lg" src={p.image} alt="" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setMsg('Subiendo foto…'); try { const { url } = await api.upload(file); setP((x) => ({ ...x, image: url })); setMsg(''); } catch (err) { setMsg((err as Error).message); } }} />
            </div>
          </div>
        </div>
        {msg && <p className="notice" role="status">{msg}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
      </form>
    </div>
  );
}
