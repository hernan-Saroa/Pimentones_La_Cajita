'use client';
import { useEffect, useState } from 'react';
import { ADMIN_ROLES } from '@lacajita/shared';
import { useAdmin, useMe } from './AdminShell';
import { fmtDate } from './ui';

const ROLE: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', ops: 'Operaciones', viewer: 'Solo lectura' };
const HELP = 'Propietario: todo, incluidos usuarios. Administrador: productos, cupones, zonas, contenido y ajustes. Operaciones: pedidos e inventario. Solo lectura: consulta.';

export function Users() {
  const api = useAdmin(); const me = useMe();
  const [rows, setRows] = useState<any[] | null>(null); const [audit, setAudit] = useState<any[]>([]); const [msg, setMsg] = useState('');
  const [nu, setNu] = useState({ email: '', name: '', password: '', role: 'ops' });
  const load = () => Promise.all([api.users().then(setRows), api.audit().then(setAudit)]).catch((e: Error) => setMsg(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const owner = me?.role === 'owner';
  return (
    <>
      <h1 className="admin-h">Usuarios y bitácora</h1>
      <p className="muted">{HELP}</p>
      {msg && <p className="notice" role="status">{msg}</p>}
      {!rows ? <p className="muted">Cargando…</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Último acceso</th>{owner && <th></th>}</tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id}><td><b>{u.name}</b><br /><small className="muted">{u.email}</small></td>
              <td>{owner ? <select value={u.role} onChange={async (e) => { try { await api.updateUser(u.id, { role: e.target.value }); load(); } catch (err) { setMsg((err as Error).message); } }}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}</select> : ROLE[u.role]}</td>
              <td><span className={`badge ${u.active ? 'b-delivered' : 'b-cancelled'}`}>{u.active ? 'Activo' : 'Inactivo'}</span></td>
              <td>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'Nunca'}</td>
              {owner && <td>{u.id !== me?.id && <button className="link-btn" onClick={async () => { try { await api.updateUser(u.id, { active: !u.active }); load(); } catch (err) { setMsg((err as Error).message); } }}>{u.active ? 'Desactivar' : 'Activar'}</button>}</td>}
            </tr>))}</tbody>
        </table></div>
      )}
      {owner && (
        <form className="panel fields" onSubmit={async (e) => { e.preventDefault(); setMsg(''); try { await api.createUser(nu); setNu({ email: '', name: '', password: '', role: 'ops' }); setMsg('Usuario creado.'); load(); } catch (err) { setMsg((err as Error).message); } }}>
          <h2 className="admin-h2 span-2">Nuevo usuario</h2>
          <label className="field">Nombre<input required value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></label>
          <label className="field">Correo<input type="email" required value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></label>
          <label className="field">Contraseña inicial<input type="password" required minLength={8} value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} autoComplete="new-password" /></label>
          <label className="field">Rol<select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>{ADMIN_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}</select></label>
          <button className="btn btn-primary">Crear usuario</button>
        </form>
      )}
      <h2 className="admin-h2">Bitácora</h2>
      {audit.length === 0 ? <p className="muted">Sin acciones registradas.</p> : (
        <div className="table-wrap"><table className="table"><tbody>{audit.map((a) => <tr key={a.id}><td><small className="muted">{fmtDate(a.createdAt)}</small></td><td>{a.actor}</td><td>{a.action} <b>{a.entity}</b> {a.entityId}</td></tr>)}</tbody></table></div>
      )}
    </>
  );
}
