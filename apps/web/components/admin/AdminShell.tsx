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

/** Puerta de acceso + navegación del panel administrativo de nivel World-Class. */
export function AdminShell({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } });
  const [me, setMe] = useState<{ id: number; email: string; name: string; role: string } | null>(() => { try { return JSON.parse(sessionStorage.getItem(KEY + '.me') || 'null'); } catch { return null; } });
  const pathname = usePathname();

  const logout = () => {
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY + '.me');
    } catch { /* no-op */ }
    setToken('');
    setMe(null);
  };

  const api = useMemo(() => {
    const a = adminApi(token);
    return Object.fromEntries(Object.entries(a).map(([k, fn]) => [k, async (...args: unknown[]) => {
      try {
        return await (fn as (...a: unknown[]) => Promise<unknown>)(...args);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && k !== 'login') logout();
        throw e;
      }
    }])) as unknown as Api;
  }, [token]);

  if (!token) {
    return (
      <Login
        onToken={(t, u) => {
          try {
            sessionStorage.setItem(KEY, t);
            sessionStorage.setItem(KEY + '.me', JSON.stringify(u));
          } catch { /* no-op */ }
          setToken(t);
          setMe(u);
        }}
      />
    );
  }

  const nav: { href: string; label: string; icon: string }[] = [
    { href: '/admin', label: 'Tablero', icon: '📊' },
    { href: '/admin/pedidos', label: 'Pedidos', icon: '📦' },
    { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
    { href: '/admin/productos', label: 'Productos', icon: '🌶️' },
    { href: '/admin/inventario', label: 'Inventario', icon: '📋' },
    { href: '/admin/cupones', label: 'Cupones', icon: '🎟️' },
    { href: '/admin/envios', label: 'Envíos', icon: '🚚' },
    { href: '/admin/mensajes', label: 'Mensajes', icon: '💬' },
    { href: '/admin/contenido', label: 'Contenido', icon: '📝' },
    { href: '/admin/ajustes', label: 'Ajustes', icon: '⚙️' },
    { href: '/admin/usuarios', label: 'Usuarios', icon: '🛡️' },
  ];

  return (
    <Ctx.Provider value={api}>
      <MeCtx.Provider value={me}>
        <div className="admin-root">
          <header className="admin-navbar">
            <div className="admin-nav-inner">
              <div className="admin-brand">
                <Link href="/admin" className="admin-brand-link">
                  <span className="admin-brand-badge">🌶️</span>
                  <div className="admin-brand-text">
                    <span className="admin-brand-name">La Cajita</span>
                    <span className="admin-brand-tag">Backoffice</span>
                  </div>
                </Link>
              </div>

              <nav className="admin-menu">
                {nav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-nav-tab ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="admin-tab-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="admin-user-bar">
                <div className="admin-user-chip">
                  <span className="admin-user-dot" />
                  <span className="admin-user-name">{me?.name || 'Administrador'}</span>
                  <span className="admin-role-badge">{me?.role || 'owner'}</span>
                </div>
                <Link href="/" target="_blank" className="admin-store-link" title="Abrir tienda en nueva pestaña">
                  Ver tienda ↗
                </Link>
                <button className="admin-logout-btn" onClick={logout} title="Cerrar sesión">
                  Salir
                </button>
              </div>
            </div>
          </header>

          <main className="admin-viewport">
            <div className="admin-container">
              {children}
            </div>
          </main>
        </div>
      </MeCtx.Provider>
    </Ctx.Provider>
  );
}

function Login({ onToken }: { onToken: (t: string, u: { id: number; email: string; name: string; role: string }) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fillDemo = () => {
    setEmail('admin@pimentoneslacajita.com');
    setPassword('LaCajita2026!Admin#Seguro');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await adminApi('').login(email, password);
      onToken(r.token, r.user);
    } catch (err) {
      setError((err as Error).message || 'Credenciales no válidas. Revisa correo y contraseña.');
      setBusy(false);
    }
  };

  return (
    <div className="admin-auth-screen">
      <div className="admin-auth-ambient-glow" />
      <div className="admin-auth-noise" />

      <div className="admin-auth-container">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <div className="admin-auth-pill">
              <span className="auth-pulse-dot" />
              <span>SISTEMA DE GESTIÓN SEGURO</span>
            </div>

            <div className="admin-auth-logo-frame">
              <span className="auth-logo-emoji">🌶️</span>
            </div>

            <h1 className="admin-auth-title">Pimentones La Cajita</h1>
            <p className="admin-auth-subtitle">
              Consola de Administración, Pedidos & Operaciones
            </p>
          </div>

          <form onSubmit={handleSubmit} className="admin-auth-form">
            <div className="admin-form-group">
              <label htmlFor="auth-email" className="admin-form-label">
                <span>CORREO ELECTRÓNICO</span>
              </label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon">✉️</span>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="admin@pimentoneslacajita.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-group">
              <div className="admin-label-row">
                <label htmlFor="auth-password" className="admin-form-label">
                  <span>CONTRASEÑA</span>
                </label>
                <button
                  type="button"
                  className="admin-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon">🔒</span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="admin-input"
                />
              </div>
            </div>

            {error && (
              <div className="admin-auth-alert" role="alert">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="admin-auth-submit-btn"
              disabled={busy}
            >
              {busy ? (
                <span className="btn-loading-state">
                  <span className="auth-spinner" /> Validando acceso…
                </span>
              ) : (
                <span className="btn-idle-state">
                  Ingresar a la Consola ➔
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="admin-quick-fill-btn"
              title="Autocompletar credenciales de administración"
            >
              ⚡ Usar credenciales maestras de administrador
            </button>
          </form>

          <div className="admin-auth-footer">
            <div className="auth-security-tag">
              <span>🛡️ Cifrado JWT SHA-256</span>
              <span className="auth-dot-sep">·</span>
              <span>PostgreSQL 16</span>
            </div>
            <Link href="/" className="auth-back-link">
              ← Volver a la tienda pública
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
