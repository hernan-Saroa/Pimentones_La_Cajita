'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { adminApi, ApiError } from '@/lib/api';

type Api = ReturnType<typeof adminApi>;
const Ctx = createContext<Api | null>(null);
const MeCtx = createContext<{ id: number; email: string; name: string; role: string } | null>(null);
export const useAdmin = () => useContext(Ctx)!;
export const useMe = () => useContext(MeCtx);
const KEY = 'lacajita.admin';

/** Puerta de acceso + navegación del panel. El token vive en la sesión del navegador (12 h). */
export function AdminShell({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } });
  const [me, setMe] = useState<{ id: number; email: string; name: string; role: string } | null>(() => { try { return JSON.parse(sessionStorage.getItem(KEY + '.me') || 'null'); } catch { return null; } });
  const pathname = usePathname();
  const logout = () => { try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(KEY + '.me'); } catch { /* */ } setToken(''); setMe(null); };
  const api = useMemo(() => {
    const a = adminApi(token);
    // Si el token expiró, cualquier llamada vuelve al login.
    return Object.fromEntries(Object.entries(a).map(([k, fn]) => [k, async (...args: unknown[]) => {
      try { return await (fn as (...a: unknown[]) => Promise<unknown>)(...args); } catch (e) { if (e instanceof ApiError && e.status === 401 && k !== 'login') logout(); throw e; }
    }])) as unknown as Api;
  }, [token]);

  if (!token) return <Login onToken={(t, u) => { try { sessionStorage.setItem(KEY, t); sessionStorage.setItem(KEY + '.me', JSON.stringify(u)); } catch { /* */ } setToken(t); setMe(u); }} />;
  const nav: [string, string][] = [['/admin', 'Tablero'], ['/admin/pedidos', 'Pedidos'], ['/admin/clientes', 'Clientes'], ['/admin/productos', 'Productos'], ['/admin/inventario', 'Inventario'], ['/admin/cupones', 'Cupones'], ['/admin/envios', 'Envíos'], ['/admin/mensajes', 'Mensajes'], ['/admin/contenido', 'Contenido'], ['/admin/ajustes', 'Ajustes'], ['/admin/usuarios', 'Usuarios']];
  return (
    <Ctx.Provider value={api}><MeCtx.Provider value={me}>
      <div className="admin">
        <header className="admin-bar">
          <Link href="/admin" className="admin-title">La Cajita · Administración</Link>
          <nav>{nav.map(([h, l]) => <Link key={h} href={h} className={pathname === h ? 'active' : ''}>{l}</Link>)}</nav>
          <div className="admin-actions"><span className="admin-me">{me?.name}</span><a href="https://siigonube.siigo.com/ISIIGO2/Login.aspx" target="_blank" rel="noreferrer" title="Facturación (Siigo)">Siigo</a><Link href="/" target="_blank">Ver tienda</Link><button className="link-btn" onClick={logout}>Cerrar sesión</button></div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </MeCtx.Provider></Ctx.Provider>
  );
}

function Login({ onToken }: { onToken: (t: string, u: { id: number; email: string; name: string; role: string }) => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return (
    <div className="admin-login">
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try { const r = await adminApi('').login(email, password); onToken(r.token, r.user); } catch (err) { setError((err as Error).message); setBusy(false); } }}>
        <img src="/img/logo-vertical.svg" alt="Pimentones La Cajita" width={160} />
        <h1>Administración</h1>
        <label className="field">Correo<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label className="field">Contraseña<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
