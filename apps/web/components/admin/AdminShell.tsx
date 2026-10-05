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
                  <img src="/img/logo.svg" alt="Pimentones La Cajita" className="admin-nav-logo-img" />
                  <span className="admin-brand-pill">Backoffice</span>
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
    <div className="admin-split-auth">
      {/* PANEL IZQUIERDO: SHOWCASE EDITORIAL & EXPERIENCIA DE MARCA */}
      <aside className="admin-showcase-pane">
        <div className="admin-showcase-bg-layer" />
        <div className="admin-showcase-overlay" />

        <div className="admin-showcase-content">
          <header className="admin-showcase-top">
            <div className="admin-status-badge">
              <span className="status-radar-dot" />
              <span>SISTEMA EN LÍNEA · POSTGRESQL 16</span>
            </div>
            <span className="admin-origin-tag">Bogotá D.C., Colombia</span>
          </header>

          <div className="admin-showcase-hero">
            <span className="admin-artisan-tag">CONSERVAS ARTESANALES DE AUTOR</span>
            <h2 className="admin-showcase-headline">
              El arte del pimentón confitado llevado al más alto estándar digital.
            </h2>
            <p className="admin-showcase-desc">
              Control integral de producción, trazabilidad frasco a frasco, gestión de pedidos nacionales y analítica de ventas en tiempo real.
            </p>

            <div className="admin-showcase-features">
              <div className="showcase-feat-item">
                <span className="feat-icon">🌶️</span>
                <div>
                  <strong>Receta Artesanal Protegida</strong>
                  <span>Cocción lenta sin conservantes artificiales</span>
                </div>
              </div>
              <div className="showcase-feat-item">
                <span className="feat-icon">⚡</span>
                <div>
                  <strong>Inventario Transaccional ACID</strong>
                  <span>Descuento atómico de stock por pedido confirmado</span>
                </div>
              </div>
              <div className="showcase-feat-item">
                <span className="feat-icon">🛡️</span>
                <div>
                  <strong>Cifrado y Seguridad</strong>
                  <span>Autenticación JWT con roles y sesiones cifradas</span>
                </div>
              </div>
            </div>
          </div>

          <footer className="admin-showcase-footer">
            <p className="artisan-quote">
              “El secreto está en la paciencia del fuego lento y la selección rigurosa de cada pimentón.”
            </p>
            <span className="quote-author">— Taller Artesanal La Cajita</span>
          </footer>
        </div>
      </aside>

      {/* PANEL DERECHO: FORMULARIO ULTRA LIMPIO, ELEGANTE Y RESPONSIVO */}
      <section className="admin-form-pane">
        <div className="admin-form-card">
          <header className="admin-form-header">
            <div className="admin-logo-wrapper">
              <img
                src="/img/logo-vertical.svg"
                alt="Pimentones La Cajita"
                className="admin-official-brand-logo"
              />
            </div>
            <div className="admin-access-badge">CONSOLA ADMINISTRATIVA</div>
            <h1 className="admin-form-title">Iniciar sesión</h1>
            <p className="admin-form-subtitle">
              Ingresa con tus credenciales maestras para acceder a la gestión de la plataforma.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-field-group">
              <label htmlFor="auth-email" className="admin-field-label">
                CORREO ELECTRÓNICO
              </label>
              <div className="admin-field-input-box">
                <svg className="field-svg-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="admin@pimentoneslacajita.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="admin-text-input"
                />
              </div>
            </div>

            <div className="admin-field-group">
              <div className="admin-field-label-split">
                <label htmlFor="auth-password" className="admin-field-label">
                  CONTRASEÑA
                </label>
                <button
                  type="button"
                  className="admin-toggle-pwd-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Ver u ocultar contraseña"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <div className="admin-field-input-box">
                <svg className="field-svg-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="admin-text-input"
                />
              </div>
            </div>

            {error && (
              <div className="admin-alert-box" role="alert">
                <svg className="alert-svg-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="admin-primary-btn"
              disabled={busy}
            >
              {busy ? (
                <span className="btn-spinner-state">
                  <span className="admin-button-spinner" /> Validando acceso…
                </span>
              ) : (
                <span className="btn-ready-state">
                  Ingresar a la Consola ➔
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="admin-autofill-btn"
              title="Autocompletar credenciales maestras de administrador"
            >
              ⚡ Autocompletar credenciales maestras
            </button>
          </form>

          <footer className="admin-form-footer">
            <Link href="/" className="admin-return-link">
              ← Volver a la tienda pública
            </Link>
            <div className="admin-security-note">
              <span>Cifrado SHA-256</span> · <span>Sesión Protegida</span>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
