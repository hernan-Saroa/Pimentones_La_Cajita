'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminApi, ApiError } from '@/lib/api';
import { Avatar, Button, Icon, Menu, PageSkeleton, UIProvider, cls, plural, type IconName } from './kit';

type Api = ReturnType<typeof adminApi>;
type Me = { id: number; email: string; name: string; role: string };
const Ctx = createContext<Api | null>(null);
const MeCtx = createContext<Me | null>(null);
export const useAdmin = () => useContext(Ctx)!;
export const useMe = () => useContext(MeCtx);
const KEY = 'lacajita.admin';
/** Preferencia del menú lateral (expandido / contraído) y punto de corte de escritorio. */
const SIDEBAR_KEY = 'lacajita.admin.sidebar';
const DESKTOP_MQ = '(min-width: 1024px)';

/** Permisos: owner > admin > ops > viewer (mismo orden que valida la API). */
const RANK: Record<string, number> = { viewer: 0, ops: 1, admin: 2, owner: 3 };
export const ROLE_LABEL: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', ops: 'Operaciones', viewer: 'Solo lectura' };
export function useCan() {
  const me = useMe();
  return (minOrPerm: 'viewer' | 'ops' | 'admin' | 'owner' | string) => {
    if (!me) return false;
    if (me.role === 'owner') return true;
    if (minOrPerm === 'owner') return false;
    if (minOrPerm === 'admin') return me.role === 'admin';
    if (minOrPerm === 'ops') return me.role === 'admin' || me.role === 'ops' || (me.role !== 'viewer');
    if (minOrPerm === 'viewer') return true;
    return true;
  };
}

/** Contadores que alimentan la barra lateral, la campana y el tablero. */
type Counts = { pendingConfirmation: number; toShip: number; unread: number; lowStock: number };
const ShellCtx = createContext<{ counts: Counts; refreshCounts: (force?: boolean) => void }>({ counts: { pendingConfirmation: 0, toShip: 0, unread: 0, lowStock: 0 }, refreshCounts: () => {} });
export const useShell = () => useContext(ShellCtx);

/**
 * Vista rápida dentro de un módulo (estilo etiquetas de Gmail / submenús de Stripe): un clic lleva al filtro exacto.
 * `q` son los parámetros que la identifican en la URL; `count` muestra el pendiente en vivo.
 */
type NavChild = { label: string; q: Record<string, string>; count?: keyof Counts };
type NavItem = { href: string; label: string; icon: IconName; count?: keyof Counts | 'orders'; keywords?: string; key: string; children?: NavChild[] };
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Inicio', items: [{ href: '/admin', label: 'Tablero', icon: 'dashboard', key: 't', keywords: 'inicio resumen ventas' }] },
  { group: 'Ventas', items: [
    { href: '/admin/pedidos', label: 'Pedidos', icon: 'orders', count: 'orders', key: 'p', keywords: 'ordenes despachar pagos remision', children: [
      { label: 'Por confirmar pago', q: { tab: 'pending' }, count: 'pendingConfirmation' },
      { label: 'Por despachar', q: { tab: 'to_ship' }, count: 'toShip' },
      { label: 'Enviados', q: { tab: 'shipped' } },
    ] },
    { href: '/admin/clientes', label: 'Clientes', icon: 'users', key: 'c', keywords: 'compradores suscriptores boletin', children: [
      { label: 'Recurrentes', q: { seg: 'repeat' } },
      { label: 'Sin compra', q: { seg: 'nobuy' } },
      { label: 'Suscriptores', q: { vista: 'suscriptores' } },
    ] },
  ] },
  { group: 'Catálogo', items: [
    { href: '/admin/productos', label: 'Productos', icon: 'tag', key: 'r', keywords: 'frascos precios fotos' },
    { href: '/admin/inventario', label: 'Inventario', icon: 'layers', count: 'lowStock', key: 'i', keywords: 'stock lotes bodega ajuste', children: [
      { label: 'Requieren atención', q: { f: 'attention' }, count: 'lowStock' },
      { label: 'Por vencer', q: { f: 'expiring' } },
    ] },
    { href: '/admin/cupones', label: 'Cupones', icon: 'ticket', key: 'u', keywords: 'descuentos promociones codigos' },
  ] },
  { group: 'Operación', items: [
    { href: '/admin/envios', label: 'Envíos', icon: 'truck', key: 'e', keywords: 'zonas tarifas departamentos contraentrega' },
    { href: '/admin/mensajes', label: 'Mensajes', icon: 'inbox', count: 'unread', key: 'm', keywords: 'contacto bandeja correo', children: [
      { label: 'Sin leer', q: { f: 'new' }, count: 'unread' },
      { label: 'Mayoristas', q: { f: 'wholesale' } },
      { label: 'Respondidos', q: { f: 'answered' } },
    ] },
  ] },
  { group: 'Tienda', items: [
    { href: '/admin/contenido', label: 'Contenido', icon: 'file', key: 'o', keywords: 'textos portada preguntas faq' },
    { href: '/admin/ajustes', label: 'Ajustes', icon: 'sliders', key: 'a', keywords: 'configuracion contacto whatsapp transferencia' },
    { href: '/admin/usuarios', label: 'Equipo y bitácora', icon: 'shield', key: 'b', keywords: 'usuarios roles permisos auditoria', children: [
      { label: 'Roles y permisos', q: { vista: 'roles' } },
      { label: 'Bitácora', q: { vista: 'bitacora' } },
    ] },
  ] },
];
const ALL = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/'));
const childHref = (it: NavItem, c: NavChild) => `${it.href}?${new URLSearchParams(c.q)}`;
const childMatch = (c: NavChild, sp: { get(k: string): string | null } | null) => !!sp && Object.entries(c.q).every(([k, v]) => sp.get(k) === v);

/** Lee los parámetros de la URL dentro de un Suspense (requisito de Next para useSearchParams). */
function WithSearch({ render }: { render: (sp: { get(k: string): string | null } | null) => ReactNode }) {
  const sp = useSearchParams();
  return <>{render(sp)}</>;
}

/** Preferencias del menú guardadas por navegador. */
function usePersisted<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); return s == null ? initial : (JSON.parse(s) as T); } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* no-op */ } }, [key, v]);
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === key && e.newValue != null) { try { setV(JSON.parse(e.newValue) as T); } catch { /* no-op */ } } };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, [key]);
  return [v, setV] as const;
}

/** Puerta de acceso + estructura del backoffice. */
export function AdminShell({ children }: { children: ReactNode }) {
  // La sesión se lee después de montar: servidor y navegador pintan lo mismo (sin errores de hidratación).
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    try { setToken(sessionStorage.getItem(KEY) || ''); setMe(JSON.parse(sessionStorage.getItem(KEY + '.me') || 'null')); } catch { /* no-op */ }
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(KEY + '.me'); } catch { /* no-op */ }
    setToken(''); setMe(null);
  }, []);

  const api = useMemo(() => {
    const a = adminApi(token);
    return Object.fromEntries(Object.entries(a).map(([k, fn]) => [
      k,
      k === 'getCache' || k === 'invalidate'
        ? fn
        : async (...args: unknown[]) => {
            try { return await (fn as (...a: unknown[]) => Promise<unknown>)(...args); }
            catch (e) { if (e instanceof ApiError && e.status === 401 && k !== 'login') logout(); throw e; }
          },
    ])) as unknown as Api;
  }, [token, logout]);

  if (!ready) return <div className="bo-boot" aria-busy="true"><img src="/img/isotipo.svg" alt="" width={56} height={56} /></div>;
  if (!token) {
    return <Login onToken={(t, u) => { try { sessionStorage.setItem(KEY, t); sessionStorage.setItem(KEY + '.me', JSON.stringify(u)); } catch { /* no-op */ } setToken(t); setMe(u); }} />;
  }
  return (
    <Ctx.Provider value={api}>
      <MeCtx.Provider value={me}>
        <UIProvider>
          <Frame me={me} onLogout={logout}>{children}</Frame>
        </UIProvider>
      </MeCtx.Provider>
    </Ctx.Provider>
  );
}

function Frame({ me, onLogout, children }: { me: Me | null; onLogout: () => void; children: ReactNode }) {
  const api = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  /**
   * Menú lateral: en escritorio se contrae a un riel de íconos y la elección se recuerda (por navegador,
   * sincronizada entre pestañas). En móvil es un cajón que se abre sobre el contenido.
   * Frame solo se monta en el navegador (AdminShell espera a leer la sesión), así que leer localStorage aquí es seguro.
   */
  const [collapsed, setCollapsed] = useState<boolean>(() => { try { return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'; } catch { return false; } });
  const [desktop, setDesktop] = useState<boolean>(() => window.matchMedia(DESKTOP_MQ).matches);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded'); } catch { /* no-op */ } }, [collapsed]);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onMq = () => { setDesktop(mq.matches); if (mq.matches) setMenuOpen(false); };
    const onStorage = (e: StorageEvent) => { if (e.key === SIDEBAR_KEY) setCollapsed(e.newValue === 'collapsed'); };
    mq.addEventListener('change', onMq);
    window.addEventListener('storage', onStorage);
    return () => { mq.removeEventListener('change', onMq); window.removeEventListener('storage', onStorage); };
  }, []);
  const rail = desktop && collapsed;
  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP_MQ).matches) setCollapsed((c) => !c);
    else setMenuOpen((o) => !o);
  }, []);
  // Cajón móvil: bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  // Tooltip del riel: se pinta fuera del menú (position: fixed) para que el scroll del menú no lo recorte.
  const [tip, setTip] = useState<{ label: string; n?: number; top: number; left: number } | null>(null);
  useEffect(() => { if (!rail) setTip(null); }, [rail]);
  const showTip = (el: HTMLElement, label: string, n?: number) => { const r = el.getBoundingClientRect(); setTip({ label, n, top: r.top + r.height / 2, left: r.right + 10 }); };
  const tipFor = (label: string, n?: number) => (rail ? {
    onMouseEnter: (e: { currentTarget: HTMLElement }) => showTip(e.currentTarget, label, n),
    onFocus: (e: { currentTarget: HTMLElement }) => showTip(e.currentTarget, label, n),
    onMouseLeave: () => setTip(null),
    onBlur: () => setTip(null),
  } : {});
  const [counts, setCounts] = useState<Counts>({ pendingConfirmation: 0, toShip: 0, unread: 0, lowStock: 0 });

  const lastCountsRef = useRef<number>(0);
  const refreshCounts = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastCountsRef.current < 4_000) return;
    lastCountsRef.current = now;
    Promise.all([api.summary(force), api.messages('new', force)])
      .then(([s, m]: [any, any[]]) => setCounts({
        pendingConfirmation: s?.pendingConfirmation ?? 0,
        toShip: s?.toShip ?? 0,
        unread: m?.length ?? 0,
        lowStock: s?.lowStock?.length ?? 0,
      }))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    refreshCounts();
    const t = setInterval(() => refreshCounts(true), 60_000);
    return () => clearInterval(t);
  }, [refreshCounts]);

  useEffect(() => {
    setMenuOpen(false);
    setPending(null);
    setTip(null);
    refreshCounts();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Navegación con respuesta inmediata. Next mantiene la pantalla anterior hasta que el servidor
   * entrega la nueva ruta; mientras tanto marcamos el destino, mostramos la barra de progreso y
   * el esqueleto de carga para que el clic se sienta instantáneo.
   * Se escucha en captura a nivel documento: cubre la barra lateral, el tablero, menús y cualquier enlace interno.
   */
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/admin')) return;
      if (url.pathname === window.location.pathname) { setPending(null); return; } // mismo módulo: solo cambia la URL, no hay espera
      setPending(url.pathname);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  // Red de seguridad: si la navegación se cancela, no dejamos el esqueleto puesto.
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 20_000);
    return () => clearTimeout(t);
  }, [pending]);
  const navigating = !!pending && pending !== pathname;
  const navigate = useCallback((href: string) => {
    const path = href.split('?')[0];
    if (path !== pathname) setPending(path);
    router.push(href);
  }, [pathname, router]);

  // Solo en desarrollo: precompila cada módulo en segundo plano (uno a la vez) para que el primer clic no espere la compilación.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    let cancelled = false;
    const t = setTimeout(async () => {
      for (const it of ALL) {
        if (cancelled) return;
        try { await fetch(it.href, { headers: { RSC: '1' }, cache: 'no-store' }); } catch { /* no-op */ }
      }
    }, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const editing = (t: EventTarget | null) => { const el = t as HTMLElement | null; return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }
      // Contraer / expandir el menú: Ctrl+\ (⌘\ en Mac) o «[» cuando no se está escribiendo.
      if (((e.metaKey || e.ctrlKey) && e.key === '\\') || (e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey && !editing(e.target))) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const shownPath = navigating ? pending! : pathname;
  const current = ALL.find((i) => isActive(shownPath, i.href)) ?? ALL[0];
  const orderCount = counts.pendingConfirmation + counts.toShip;
  const countFor = (k?: NavItem['count']) => (k === 'orders' ? orderCount : k ? counts[k] : 0);
  const totalAlerts = orderCount + counts.unread + counts.lowStock;
  const shell = useMemo(() => ({ counts, refreshCounts }), [counts, refreshCounts]);

  return (
    <ShellCtx.Provider value={shell}>
      <div className="bo">
        <div className={cls('bo-progress', navigating && 'is-on')} role="progressbar" aria-hidden={!navigating} aria-label="Cargando módulo" />
        <div className={cls('bo-layout', rail && 'is-collapsed')}>
          <aside id="bo-sidebar" className={cls('bo-side', menuOpen && 'is-open')} aria-label="Navegación del backoffice">
            <div className="bo-side-top">
              <Link href="/admin" prefetch={true} className="bo-brand" aria-label="Ir al tablero" {...tipFor('Ir al tablero')}>
                <img className="bo-brand-logo" src="/img/logo.svg" alt="Pimentones La Cajita" />
                <img className="bo-brand-mark" src="/img/isotipo.svg" alt="" aria-hidden="true" />
              </Link>
              <a href="/" target="_blank" rel="noreferrer" className="bo-store" aria-label="Tienda en línea · publicada · ver sitio" {...tipFor('Tienda publicada · ver sitio')}>
                <Icon name="store" size={18} />
                <div><b>Tienda en línea</b><span><i className="bo-live" />Publicada · ver sitio</span></div>
                <Icon name="external" size={14} />
              </a>
            </div>
            <nav className="bo-nav" onScroll={() => setTip(null)}>
              {NAV.map((g) => (
                <div key={g.group} className="bo-nav-group">
                  <span className="bo-nav-title">{g.group}</span>
                  {g.items.map((it) => {
                    const n = countFor(it.count); const active = isActive(shownPath, it.href);
                    return (
                      <Link key={it.href} href={it.href} prefetch={true} className={cls('bo-nav-item', active && 'is-active')} aria-current={active ? 'page' : undefined} {...tipFor(it.label, n)}>
                        <Icon name={it.icon} size={18} /><span className="bo-nav-label">{it.label}</span>
                        {n > 0 && <span className={cls('bo-nav-count', it.count === 'lowStock' ? 'is-warn' : 'is-alert')} aria-label={`${n} pendientes`}>{n > 99 ? '99+' : n}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="bo-side-foot">
              <button type="button" className="bo-side-toggle" onClick={toggleSidebar} aria-controls="bo-sidebar" aria-expanded={!rail} {...tipFor('Expandir menú  ·  Ctrl \\')}>
                <Icon name={rail ? 'panelOpen' : 'panelClose'} size={18} />
                <span className="bo-nav-label">Contraer menú</span>
                <kbd className="bo-nav-label">Ctrl \</kbd>
              </button>
              <Menu up left trigger={(toggle) => (
                <button className="bo-user" onClick={toggle} {...tipFor(me?.name || 'Mi cuenta')}>
                  <Avatar name={me?.name || 'Admin'} size={34} />
                  <div><b>{me?.name || 'Administrador'}</b><span>{ROLE_LABEL[me?.role ?? ''] ?? me?.role}</span></div>
                  <Icon name="chevronUp" size={16} className="faint" />
                </button>
              )} items={[
                { group: me?.email ?? '' },
                { label: 'Ver tienda', icon: 'external', href: '/', external: true },
                { label: 'Equipo y bitácora', icon: 'shield', href: '/admin/usuarios' },
                'sep',
                { label: 'Cerrar sesión', icon: 'logout', onClick: onLogout, danger: true },
              ]} />
            </div>
            {/* Asa en el borde: aparece al pasar por el menú (patrón de Atlassian/Notion). */}
            <button type="button" className="bo-side-handle" onClick={toggleSidebar} aria-label={rail ? 'Expandir menú' : 'Contraer menú'} title={rail ? 'Expandir menú (Ctrl+\\)' : 'Contraer menú (Ctrl+\\)'} tabIndex={-1}>
              <Icon name={rail ? 'chevronRight' : 'chevronLeft'} size={14} />
            </button>
          </aside>
          <div className={cls('bo-scrim', menuOpen && 'is-open')} onClick={() => setMenuOpen(false)} aria-hidden="true" />

          <div className="bo-main">
            <header className={cls('bo-topbar', scrolled && 'is-scrolled')}>
              <Button
                variant="ghost" iconOnly icon={desktop ? (rail ? 'panelOpen' : 'panelClose') : 'menu'} className="bo-burger" onClick={toggleSidebar}
                aria-controls="bo-sidebar" aria-expanded={desktop ? !rail : menuOpen}
                aria-label={desktop ? (rail ? 'Expandir menú' : 'Contraer menú') : 'Abrir menú'}
                title={desktop ? `${rail ? 'Expandir' : 'Contraer'} menú (Ctrl+\\)` : 'Abrir menú'}
              />
              <div className="bo-crumbs">
                <Icon name={current.icon} size={16} className="faint bo-hide-sm" />
                <span className="bo-hide-sm">{current.group}</span>
                <Icon name="chevronRight" size={14} className="faint bo-hide-sm" />
                <b>{current.label}</b>
              </div>

              <button type="button" className="bo-top-search bo-hide-sm" onClick={() => setCommandOpen(true)} aria-label="Abrir buscador global y atajos">
                <Icon name="search" size={15} />
                <span>Buscar pedidos, clientes, catálogo o atajos...</span>
                <kbd>Ctrl K</kbd>
              </button>

              <div className="bo-top-actions">
                <button type="button" className="bo-btn bo-btn--ghost bo-btn--icon bo-only-sm" onClick={() => setCommandOpen(true)} aria-label="Buscar">
                  <Icon name="search" size={18} />
                </button>
                <Menu trigger={(toggle) => (
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <Button variant="ghost" iconOnly icon="bell" onClick={toggle} aria-label={`Pendientes: ${totalAlerts}`} />
                    {totalAlerts > 0 && <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 8, background: 'var(--red)', boxShadow: '0 0 0 2px #fff' }} />}
                  </span>
                )} items={totalAlerts === 0 ? [{ group: 'Pendientes' }, { label: 'Todo al día. No hay nada pendiente.', icon: 'checkCircle' }] : [
                  { group: 'Pendientes' },
                  { label: `${plural(counts.pendingConfirmation, 'pago', 'pagos')} por confirmar`, icon: 'card', href: '/admin/pedidos?tab=pending', hidden: !counts.pendingConfirmation },
                  { label: `${plural(counts.toShip, 'pedido', 'pedidos')} por despachar`, icon: 'truck', href: '/admin/pedidos?tab=paid', hidden: !counts.toShip },
                  { label: `${plural(counts.unread, 'mensaje nuevo', 'mensajes nuevos')}`, icon: 'inbox', href: '/admin/mensajes', hidden: !counts.unread },
                  { label: `${plural(counts.lowStock, 'producto', 'productos')} con inventario bajo`, icon: 'alert', href: '/admin/inventario?f=attention', hidden: !counts.lowStock },
                ]} />
                <a href="/" target="_blank" rel="noreferrer" className="bo-btn bo-btn--secondary bo-btn--sm bo-hide-sm"><Icon name="external" size={15} />Ver tienda</a>
              </div>
            </header>
            <main className="bo-content" aria-busy={navigating}>{navigating ? <div className="bo-page-loading"><PageSkeleton /></div> : children}</main>
          </div>
        </div>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} />
        {tip && (
          <div className="bo-rail-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>
            {tip.label}{!!tip.n && <span className="bo-rail-tip-n">{tip.n}</span>}
          </div>
        )}
      </div>
    </ShellCtx.Provider>
  );
}

function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (href: string) => void }) {
  const api = useAdmin();
  const [q, setQ] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      api.orders({ limit: '25' }).then((r) => setOrders(Array.isArray(r) ? r : [])).catch(() => {});
      api.products().then((r) => setProducts(Array.isArray(r) ? r : [])).catch(() => {});
    }
  }, [open, api]);

  const query = q.trim().toLowerCase();

  const navMatches = useMemo(() => {
    if (!query) return ALL.slice(0, 6);
    return ALL.filter((i) => i.label.toLowerCase().includes(query) || (i.keywords ?? '').toLowerCase().includes(query) || i.group.toLowerCase().includes(query));
  }, [query]);

  const quickActions = useMemo(() => {
    const actions = [
      { id: 'act-new-prod', label: 'Nuevo producto', icon: 'plus' as IconName, href: '/admin/productos?nuevo=1', category: 'Acciones' },
      { id: 'act-new-lot', label: 'Ingresar lote a inventario', icon: 'layers' as IconName, href: '/admin/inventario?lote=1', category: 'Acciones' },
      { id: 'act-new-coupon', label: 'Crear nuevo cupón', icon: 'ticket' as IconName, href: '/admin/cupones?nuevo=1', category: 'Acciones' },
      { id: 'act-view-store', label: 'Ver tienda en vivo', icon: 'store' as IconName, href: '/', external: true, category: 'Acciones' },
    ];
    if (!query) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(query));
  }, [query]);

  const orderMatches = useMemo(() => {
    if (!query) return [];
    return orders.filter((o) =>
      (o.reference ?? '').toLowerCase().includes(query) ||
      (o.customerName ?? '').toLowerCase().includes(query) ||
      (o.customerPhone ?? '').toLowerCase().includes(query) ||
      (o.city ?? '').toLowerCase().includes(query)
    ).slice(0, 4);
  }, [query, orders]);

  const productMatches = useMemo(() => {
    if (!query) return [];
    return products.filter((p) =>
      (p.name ?? '').toLowerCase().includes(query) ||
      (p.kicker ?? '').toLowerCase().includes(query) ||
      (p.slug ?? '').toLowerCase().includes(query)
    ).slice(0, 4);
  }, [query, products]);

  const allItems = useMemo(() => [
    ...quickActions.map((a) => ({ ...a, type: 'action' as const })),
    ...navMatches.map((n) => ({ ...n, id: n.href, type: 'nav' as const, category: 'Navegación' })),
    ...orderMatches.map((o) => ({ id: `ord-${o.id}`, label: `Pedido ${o.reference} · ${o.customerName}`, sub: `$${Number(o.total || 0).toLocaleString('es-CO')} · ${o.city || ''}`, icon: 'orders' as IconName, href: `/admin/pedidos?id=${o.id}`, type: 'order' as const, category: 'Pedidos' })),
    ...productMatches.map((p) => ({ id: `prod-${p.id}`, label: p.name, sub: `$${Number(p.price || 0).toLocaleString('es-CO')} · ${p.stock ?? 0} en bodega`, icon: 'tag' as IconName, href: `/admin/productos?id=${p.id}`, type: 'product' as const, category: 'Catálogo' })),
  ], [quickActions, navMatches, orderMatches, productMatches]);

  const execute = (it?: (typeof allItems)[0]) => {
    if (!it) return;
    onClose();
    if ('external' in it && it.external) {
      window.open(it.href, '_blank');
    } else if (it.href) {
      onNavigate(it.href);
    }
  };

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(allItems[selectedIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="bo-cmd-backdrop" onClick={onClose}>
      <div className="bo-cmd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Búsqueda global y atajos">
        <header className="bo-cmd-header">
          <Icon name="search" size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="bo-cmd-input"
            placeholder="Buscar pedidos, clientes, productos o escribir un atajo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Buscar en la administración"
          />
          <kbd style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 5, color: '#64748b' }}>ESC</kbd>
        </header>

        <div className="bo-cmd-list">
          {allItems.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
              No encontramos nada que coincida con “<b>{q}</b>”.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <button
                  key={item.id ?? item.href}
                  type="button"
                  className={cls('bo-cmd-item', isSelected && 'is-selected')}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <Icon name={item.icon} size={16} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontWeight: isSelected ? 650 : 550, color: 'inherit' }}>{item.label}</div>
                    {'sub' in item && item.sub && <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 1 }}>{item.sub}</div>}
                  </div>
                  <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>{item.category}</span>
                </button>
              );
            })
          )}
        </div>

        <footer className="bo-cmd-footer">
          <span><kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>↑</kbd><kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>↓</kbd> Navegar</span>
          <span><kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>↵</kbd> Seleccionar</span>
          <span style={{ marginLeft: 'auto', color: 'var(--brand)', fontWeight: 600 }}>Pimentones La Cajita</span>
        </footer>
      </div>
    </div>
  );
}

function Login({ onToken }: { onToken: (t: string, u: { id: number; email: string; name: string; role: string }) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Solo en desarrollo: nunca se publican credenciales en el sitio en producción.
  const isDev = process.env.NODE_ENV !== 'production';
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
              <span>CONSOLA DE OPERACIÓN</span>
            </div>
            <span className="admin-origin-tag">Bogotá D.C., Colombia</span>
          </header>

          <div className="admin-showcase-hero">
            <span className="admin-artisan-tag">CONSERVAS ARTESANALES DE AUTOR</span>
            <h2 className="admin-showcase-headline">
              Todo tu negocio, en un solo lugar.
            </h2>
            <p className="admin-showcase-desc">
              Confirma pagos, despacha pedidos, controla tus lotes de producción y mira cómo van las ventas, desde el computador o el celular.
            </p>

            <div className="admin-showcase-features">
              <div className="showcase-feat-item">
                <span className="feat-icon"><Icon name="orders" size={18} /></span>
                <div>
                  <strong>Pedidos paso a paso</strong>
                  <span>Cada pedido te dice qué sigue: confirmar, preparar o despachar</span>
                </div>
              </div>
              <div className="showcase-feat-item">
                <span className="feat-icon"><Icon name="layers" size={18} /></span>
                <div>
                  <strong>Inventario con trazabilidad</strong>
                  <span>Lotes con vencimiento y cada frasco registrado</span>
                </div>
              </div>
              <div className="showcase-feat-item">
                <span className="feat-icon"><Icon name="shield" size={18} /></span>
                <div>
                  <strong>Acceso por roles</strong>
                  <span>Cada persona del equipo ve solo lo que necesita</span>
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
            <div className="admin-access-badge">PANEL ADMINISTRATIVO</div>
            <h1 className="admin-form-title">Iniciar sesión</h1>
            <p className="admin-form-subtitle">
              Entra con el correo y la contraseña que te dio el propietario de la tienda.
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
                  Entrar <Icon name="arrowRight" size={16} />
                </span>
              )}
            </button>

            {isDev && (
              <button
                type="button"
                onClick={fillDemo}
                className="admin-autofill-btn"
                title="Solo visible en desarrollo"
              >
                Usar cuenta de prueba (solo desarrollo)
              </button>
            )}
          </form>

          <footer className="admin-form-footer">
            <Link href="/" className="admin-return-link">
              ← Volver a la tienda
            </Link>
            <div className="admin-security-note">
              <Icon name="lock" size={12} /> <span>Conexión segura</span>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
